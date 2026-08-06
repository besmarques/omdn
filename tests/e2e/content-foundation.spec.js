import { expect, test } from '@playwright/test';

import createPublicRecipeRepository from '#server/modules/content/recipes/publicRecipeRepository';
import createPublicRecipeService from '#server/modules/content/recipes/publicRecipeService';

import { applyTestDatabaseSeeds, createTestDatabaseConnection, createTestDatabasePool } from './database.js';

import createEditPostRepository from '#server/modules/admin/posts/editPostRepository';

const contentTables = [
	'authors',
	'categories',
	'content_events',
	'domain_outbox',
	'post_categories',
	'post_revision_heads',
	'post_revisions',
	'post_tags',
	'posts',
	'publication_schedules',
	'route_slugs',
	'tags',
];

const expectedPostPermissions = {
	administrator: [
		'posts.create',
		'posts.delete_all',
		'posts.delete_own',
		'posts.delete_permanent',
		'posts.edit_all',
		'posts.edit_own',
		'posts.publish_all',
		'posts.publish_own',
		'posts.review_all',
		'posts.submit_own',
	],
	author: ['posts.create', 'posts.delete_own', 'posts.edit_own', 'posts.publish_own', 'posts.submit_own'],
	contributor: ['posts.create', 'posts.delete_own', 'posts.edit_own', 'posts.submit_own'],
	editor: ['posts.create', 'posts.delete_all', 'posts.edit_all', 'posts.publish_all', 'posts.review_all'],
	subscriber: [],
};

async function readPostPermissions(database) {
	const [rows] = await database.execute(
		`SELECT roles.slug, permissions.code
		 FROM roles
		 LEFT JOIN role_permissions
			ON role_permissions.role_id = roles.id
		 LEFT JOIN permissions
			ON permissions.id = role_permissions.permission_id
			AND permissions.code LIKE 'posts.%'
		 ORDER BY roles.slug, permissions.code`,
	);

	return Object.fromEntries(
		Object.keys(expectedPostPermissions).map((role) => [role, rows.filter((row) => row.slug === role && row.code).map((row) => row.code)]),
	);
}

test('applies the content schema and scoped editorial seed idempotently', async () => {
	const database = await createTestDatabaseConnection();
	const publicRecipes = createPublicRecipeService(createPublicRecipeRepository(database));

	try {
		const [tables] = await database.execute(
			`SELECT table_name
			 FROM information_schema.tables
			 WHERE table_schema = DATABASE()
				AND table_name IN (${contentTables.map(() => '?').join(', ')})
			 ORDER BY table_name`,
			contentTables,
		);

		const actualTables = tables.map((row) => row.TABLE_NAME ?? row.table_name);

		expect(actualTables).toHaveLength(contentTables.length);
		expect(actualTables).toEqual(expect.arrayContaining(contentTables));
		expect(await readPostPermissions(database)).toEqual(expectedPostPermissions);

		await applyTestDatabaseSeeds();

		expect(await readPostPermissions(database)).toEqual(expectedPostPermissions);
		await expect(publicRecipes.getBySlug('bolachas-de-gengibre')).resolves.toMatchObject({
			canonicalSlug: 'bolachas-de-gengibre',
			redirect: false,
			recipe: {
				author: { displayName: 'Cozinha OMDN' },
				source: { kind: 'recipe', schemaVersion: 1 },
				title: 'Bolachas de gengibre',
			},
		});
		const [[seedCount]] = await database.execute(
			`SELECT COUNT(*) AS total
			 FROM route_slugs
			 WHERE resource_type = 'post' AND slug = 'bolachas-de-gengibre'`,
		);
		expect(Number(seedCount.total)).toBe(1);
		const [[legacyPermission]] = await database.execute("SELECT COUNT(*) AS total FROM permissions WHERE code = 'posts.publish'");
		expect(Number(legacyPermission.total)).toBe(0);
	} finally {
		await database.end();
	}
});

test('enforces revision ownership, canonical slugs, active schedules, and deletion ordering', async () => {
	const database = await createTestDatabaseConnection();
	const publicRecipes = createPublicRecipeService(createPublicRecipeRepository(database));

	try {
		const [userResult] = await database.execute(
			`INSERT INTO users (email, display_name, status, email_verified_at)
			 VALUES ('content-schema@example.com', 'Content Schema', 'active', CURRENT_TIMESTAMP(3))`,
		);
		const userId = userResult.insertId;
		const [authorResult] = await database.execute('INSERT INTO authors (user_id, display_name) VALUES (?, ?)', [userId, 'Content Schema']);
		const authorId = authorResult.insertId;
		const [categoryResult] = await database.execute(
			"INSERT INTO categories (content_type, name, normalized_name) VALUES ('recipe', ?, ?)",
			['Recipes', 'recipes'],
		);
		const categoryId = categoryResult.insertId;
		const [tagResult] = await database.execute("INSERT INTO tags (content_type, name, normalized_name) VALUES ('recipe', ?, ?)", [
			'Christmas',
			'christmas',
		]);
		const tagId = tagResult.insertId;
		const [postResult] = await database.execute(
			`INSERT INTO posts (owner_user_id, author_id, content_type, primary_category_id)
			 VALUES (?, ?, 'recipe', ?)`,
			[userId, authorId, categoryId],
		);
		const postId = postResult.insertId;
		const [revisionResult] = await database.execute(
			`INSERT INTO post_revisions (
				post_id, revision_number, created_by_user_id, title,
				layout_key, template_key, header_key, footer_key,
				region_config, source, source_schema_version, render_version,
				plain_text, source_sha256
			 ) VALUES (?, 1, ?, ?, 'sidebar', 'recipe', 'hero', 'standard', ?, ?, 1, 1, ?, ?)`,
			[
				postId,
				userId,
				'Content schema recipe',
				JSON.stringify({ sidebar: [] }),
				JSON.stringify({
					cookMinutes: 15,
					description: 'The immutable published recipe.',
					difficulty: 'easy',
					ingredients: [{ id: 'flour', name: 'flour', quantity: '200', unit: 'g' }],
					instructions: [{ id: 'mix', text: 'Mix the ingredients.' }],
					kind: 'recipe',
					prepMinutes: 10,
					schemaVersion: 1,
					title: 'Content schema recipe',
					yield: { quantity: 8, unit: 'servings' },
				}),
				'Content schema recipe',
				Buffer.alloc(32, 1),
			],
		);
		const revisionId = revisionResult.insertId;

		await database.execute('INSERT INTO post_revision_heads (post_id, current_revision_id) VALUES (?, ?)', [postId, revisionId]);
		const [draftRevisionResult] = await database.execute(
			`INSERT INTO post_revisions (
				post_id, revision_number, created_by_user_id, title,
				layout_key, template_key, header_key, footer_key,
				region_config, source, source_schema_version, render_version,
				plain_text, source_sha256
			 )
			 SELECT post_id, 2, created_by_user_id, 'New unpublished draft',
				layout_key, template_key, header_key, footer_key,
				region_config, JSON_SET(source, '$.title', 'New unpublished draft'),
				source_schema_version, render_version, 'New unpublished draft', ?
			 FROM post_revisions
			 WHERE id = ?`,
			[Buffer.alloc(32, 2), revisionId],
		);
		await database.execute(
			`UPDATE post_revision_heads
			 SET current_revision_id = ?, published_revision_id = ?
			 WHERE post_id = ?`,
			[draftRevisionResult.insertId, revisionId, postId],
		);
		await database.execute(
			`UPDATE posts
			 SET status = 'published', published_at = '2026-08-05 00:00:00.000'
			 WHERE id = ?`,
			[postId],
		);
		await database.execute('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)', [postId, categoryId]);
		await database.execute('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tagId]);
		await database.execute(
			"INSERT INTO route_slugs (resource_type, resource_id, slug, kind) VALUES ('post', ?, 'content-schema-recipe', 'canonical')",
			[postId],
		);

		await expect(
			database.execute(
				"INSERT INTO route_slugs (resource_type, resource_id, slug, kind) VALUES ('post', ?, 'content-schema-recipe-2', 'canonical')",
				[postId],
			),
		).rejects.toThrow();

		await database.execute(
			"INSERT INTO route_slugs (resource_type, resource_id, slug, kind) VALUES ('post', ?, 'old-content-schema-recipe', 'redirect')",
			[postId],
		);

		await expect(publicRecipes.getBySlug('content-schema-recipe')).resolves.toMatchObject({
			canonicalSlug: 'content-schema-recipe',
			redirect: false,
			recipe: {
				source: { title: 'Content schema recipe' },
				title: 'Content schema recipe',
			},
		});
		await expect(publicRecipes.getBySlug('old-content-schema-recipe')).resolves.toMatchObject({
			canonicalSlug: 'content-schema-recipe',
			redirect: true,
		});
		const recipeArchive = await publicRecipes.list({ limit: 10 });
		expect(recipeArchive.items).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: Number(postId), title: 'Content schema recipe' })]),
		);
		await database.execute(
			`INSERT INTO publication_schedules (post_id, revision_id, publish_at, created_by_user_id)
			 VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 1 DAY), ?)`,
			[postId, revisionId, userId],
		);

		await expect(
			database.execute(
				`INSERT INTO publication_schedules (post_id, revision_id, publish_at, created_by_user_id)
				 VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY), ?)`,
				[postId, revisionId, userId],
			),
		).rejects.toThrow();

		const [otherPostResult] = await database.execute("INSERT INTO posts (owner_user_id, author_id, content_type) VALUES (?, ?, 'recipe')", [
			userId,
			authorId,
		]);

		await expect(
			database.execute('INSERT INTO post_revision_heads (post_id, current_revision_id) VALUES (?, ?)', [
				otherPostResult.insertId,
				revisionId,
			]),
		).rejects.toThrow();

		await expect(database.execute('DELETE FROM users WHERE id = ?', [userId])).rejects.toThrow();

		const [outboxResult] = await database.execute(
			"INSERT INTO domain_outbox (aggregate_type, aggregate_id, event_type, payload) VALUES ('post', ?, 'PostCreated', ?)",
			[postId, JSON.stringify({ postId })],
		);
		await database.execute(
			`INSERT INTO content_events (outbox_id, post_id, revision_id, actor_user_id, event_type)
			 VALUES (?, ?, ?, ?, 'post_created')`,
			[outboxResult.insertId, postId, revisionId, userId],
		);

		await database.beginTransaction();
		await database.execute('DELETE FROM publication_schedules WHERE post_id = ?', [postId]);
		await database.execute('DELETE FROM route_slugs WHERE resource_type = ? AND resource_id = ?', ['post', postId]);
		await database.execute('DELETE FROM post_categories WHERE post_id = ?', [postId]);
		await database.execute('DELETE FROM post_tags WHERE post_id = ?', [postId]);
		await database.execute('DELETE FROM post_revision_heads WHERE post_id = ?', [postId]);
		await database.execute('DELETE FROM posts WHERE id = ?', [postId]);
		await database.commit();

		const [[event]] = await database.execute('SELECT post_id, revision_id FROM content_events WHERE outbox_id = ?', [
			outboxResult.insertId,
		]);
		expect(event).toMatchObject({ post_id: null, revision_id: null });

		await database.execute('DELETE FROM posts WHERE id = ?', [otherPostResult.insertId]);
		await database.execute('DELETE FROM authors WHERE id = ?', [authorId]);
		await database.execute('DELETE FROM users WHERE id = ?', [userId]);
	} catch (error) {
		await database.rollback().catch(() => {});
		throw error;
	} finally {
		await database.end();
	}
});
test('editing a published recipe creates a draft revision without replacing the published revision', async () => {
	const database = createTestDatabasePool();
	const editPosts = createEditPostRepository(database);
	const publicRecipes = createPublicRecipeService(createPublicRecipeRepository(database));

	let userId;
	let authorId;
	let categoryId;
	let postId;

	const publishedSource = {
		cookMinutes: 15,
		description: 'This is the currently published recipe.',
		difficulty: 'easy',
		ingredients: [
			{
				id: 'flour',
				name: 'flour',
				quantity: '200',
				unit: 'g',
			},
		],
		instructions: [
			{
				id: 'mix',
				text: 'Mix the ingredients.',
			},
		],
		kind: 'recipe',
		prepMinutes: 10,
		schemaVersion: 1,
		title: 'Published recipe title',
		yield: {
			quantity: 8,
			unit: 'servings',
		},
	};

	const editedSource = {
		...publishedSource,
		description: 'These changes have only been saved in the editor.',
		title: 'Unpublished edited title',
	};

	try {
		const [userResult] = await database.execute(
			`INSERT INTO users (
				email,
				display_name,
				status,
				email_verified_at
			) VALUES (?, ?, 'active', CURRENT_TIMESTAMP(3))`,
			['published-edit-test@example.com', 'Published Edit Test'],
		);

		userId = userResult.insertId;

		const [authorResult] = await database.execute(
			`INSERT INTO authors (
				user_id,
				display_name
			) VALUES (?, ?)`,
			[userId, 'Published Edit Test'],
		);

		authorId = authorResult.insertId;

		const [categoryResult] = await database.execute(
			`INSERT INTO categories (
				content_type,
				name,
				normalized_name
			) VALUES ('recipe', ?, ?)`,
			['Published Edit Recipes', 'published-edit-recipes'],
		);

		categoryId = categoryResult.insertId;

		const [postResult] = await database.execute(
			`INSERT INTO posts (
				owner_user_id,
				author_id,
				content_type,
				status,
				visibility,
				primary_category_id,
				published_at
			) VALUES (?, ?, 'recipe', 'published', 'public', ?, CURRENT_TIMESTAMP(3))`,
			[userId, authorId, categoryId],
		);

		postId = postResult.insertId;

		const [revisionResult] = await database.execute(
			`INSERT INTO post_revisions (
				post_id,
				revision_number,
				created_by_user_id,
				title,
				excerpt,
				seo_title,
				seo_description,
				focus_keyword,
				layout_key,
				template_key,
				header_key,
				footer_key,
				region_config,
				source,
				source_schema_version,
				render_version,
				plain_text,
				source_sha256
			) VALUES (
				?,
				1,
				?,
				?,
				?,
				?,
				?,
				?,
				'full-width',
				'recipe',
				'minimal',
				'standard',
				?,
				?,
				1,
				1,
				?,
				?
			)`,
			[
				postId,
				userId,
				publishedSource.title,
				publishedSource.description,
				`${publishedSource.title} | O Melhor do Natal`,
				publishedSource.description,
				'published recipe',
				JSON.stringify({ sidebar: [] }),
				JSON.stringify(publishedSource),
				`${publishedSource.title}\n${publishedSource.description}`,
				Buffer.alloc(32, 31),
			],
		);

		const publishedRevisionId = revisionResult.insertId;

		await database.execute(
			`INSERT INTO post_revision_heads (
				post_id,
				current_revision_id,
				published_revision_id
			) VALUES (?, ?, ?)`,
			[postId, publishedRevisionId, publishedRevisionId],
		);

		await database.execute(
			`INSERT INTO post_categories (
				post_id,
				category_id
			) VALUES (?, ?)`,
			[postId, categoryId],
		);

		await database.execute(
			`INSERT INTO route_slugs (
				resource_type,
				resource_id,
				slug,
				kind
			) VALUES ('post', ?, ?, 'canonical')`,
			[postId, 'published-edit-integrity-test'],
		);

		await expect(publicRecipes.getBySlug('published-edit-integrity-test')).resolves.toMatchObject({
			recipe: {
				source: {
					title: 'Published recipe title',
				},
				title: 'Published recipe title',
			},
		});

		await editPosts.update({
			actor: {
				id: Number(userId),
			},
			categoryId: Number(categoryId),
			contentType: 'recipe',
			expectedLockVersion: 1,
			excerpt: editedSource.description,
			id: Number(postId),
			isPillar: false,
			media: {
				featured: null,
				gallery: [],
			},
			plainText: `${editedSource.title}\n${editedSource.description}`,
			seo: {
				description: editedSource.description,
				focusKeyword: 'edited recipe',
				title: `${editedSource.title} | O Melhor do Natal`,
			},
			slug: 'published-edit-integrity-test',
			source: editedSource,
			sourceHash: Buffer.alloc(32, 32),
			tagIds: [],
		});

		const [[heads]] = await database.execute(
			`SELECT
				current_revision_id,
				published_revision_id
			FROM post_revision_heads
			WHERE post_id = ?`,
			[postId],
		);

		const currentRevisionId = Number(heads.current_revision_id);

		expect(currentRevisionId).not.toBe(Number(publishedRevisionId));
		expect(Number(heads.published_revision_id)).toBe(Number(publishedRevisionId));

		const [[currentRevision]] = await database.execute(
			`SELECT title
			FROM post_revisions
			WHERE id = ?`,
			[currentRevisionId],
		);

		const [[publishedRevision]] = await database.execute(
			`SELECT title
			FROM post_revisions
			WHERE id = ?`,
			[publishedRevisionId],
		);

		expect(currentRevision.title).toBe('Unpublished edited title');
		expect(publishedRevision.title).toBe('Published recipe title');

		await expect(publicRecipes.getBySlug('published-edit-integrity-test')).resolves.toMatchObject({
			recipe: {
				source: {
					title: 'Published recipe title',
				},
				title: 'Published recipe title',
			},
		});
	} finally {
		if (postId) {
			await database.execute(
				`DELETE FROM route_slugs
				WHERE resource_type = 'post'
					AND resource_id = ?`,
				[postId],
			);

			await database.execute(
				`DELETE FROM post_revision_heads
				WHERE post_id = ?`,
				[postId],
			);

			await database.execute(
				`DELETE FROM posts
				WHERE id = ?`,
				[postId],
			);
		}

		if (categoryId) {
			await database.execute(
				`DELETE FROM categories
				WHERE id = ?`,
				[categoryId],
			);
		}

		if (authorId) {
			await database.execute(
				`DELETE FROM authors
				WHERE id = ?`,
				[authorId],
			);
		}

		if (userId) {
			await database.execute(
				`DELETE FROM users
				WHERE id = ?`,
				[userId],
			);
		}

		await database.end();
	}
});
