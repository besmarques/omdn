const publicRecipeSelection = `
	SELECT
		posts.id,
		posts.content_type,
		posts.published_at,
		authors.id AS author_id,
		authors.display_name AS author_display_name,
		categories.id AS primary_category_id,
		categories.name AS primary_category_name,
		canonical_slug.slug AS canonical_slug,
		post_revisions.title,
		post_revisions.excerpt,
		post_revisions.seo_title,
		post_revisions.seo_description,
		post_revisions.layout_key,
		post_revisions.template_key,
		post_revisions.header_key,
		post_revisions.footer_key,
		post_revisions.region_config,
		post_revisions.source,
		post_revisions.source_schema_version,
		post_revisions.render_version
	FROM posts
	INNER JOIN authors
		ON authors.id = posts.author_id
	LEFT JOIN categories
		ON categories.id = posts.primary_category_id
	INNER JOIN post_revision_heads
		ON post_revision_heads.post_id = posts.id
	INNER JOIN post_revisions
		ON post_revisions.post_id = posts.id
		AND post_revisions.id = post_revision_heads.published_revision_id
	INNER JOIN route_slugs AS canonical_slug
		ON canonical_slug.resource_type = 'post'
		AND canonical_slug.resource_id = posts.id
		AND canonical_slug.kind = 'canonical'
`;

function publicPostPredicate(contentType) {
	return `
	posts.content_type = '${contentType}'
	AND posts.status = 'published'
	AND posts.visibility = 'public'
	AND posts.published_at IS NOT NULL
	AND posts.trashed_at IS NULL`;
}

export default function createPublicRecipeRepository(db, { contentType = 'recipe' } = {}) {
	const publicRecipePredicate = publicPostPredicate(contentType);
	async function findBySlug(slug) {
		const [rows] = await db.execute(
			`${publicRecipeSelection}
			 INNER JOIN route_slugs AS requested_slug
				ON requested_slug.resource_type = 'post'
				AND requested_slug.resource_id = posts.id
			 WHERE ${publicRecipePredicate}
				AND requested_slug.slug = ?
			 LIMIT 1`,
			[slug],
		);

		if (!rows[0]) {
			return null;
		}

		return {
			...rows[0],
			requested_slug_kind: rows[0].canonical_slug === slug ? 'canonical' : 'redirect',
		};
	}

	async function list({ limit, cursor = null }) {
		const parameters = [];
		let cursorPredicate = '';

		if (cursor) {
			cursorPredicate = `
				AND (
					posts.published_at < ?
					OR (posts.published_at = ? AND posts.id < ?)
				)`;
			parameters.push(cursor.publishedAt, cursor.publishedAt, cursor.id);
		}

		parameters.push(limit);

		const [rows] = await db.execute(
			`${publicRecipeSelection}
			 WHERE ${publicRecipePredicate}
			 ${cursorPredicate}
			 ORDER BY posts.published_at DESC, posts.id DESC
			 LIMIT ?`,
			parameters,
		);

		return rows;
	}

	async function count() {
		const [[row]] = await db.execute(
			`SELECT COUNT(*) AS total
			 FROM (${publicRecipeSelection}
				WHERE ${publicRecipePredicate}) AS public_recipes`,
		);

		return Number(row.total);
	}

	async function listPage({ limit, offset }) {
		const [rows] = await db.execute(
			`${publicRecipeSelection}
			 WHERE ${publicRecipePredicate}
			 ORDER BY posts.published_at DESC, posts.id DESC
			 LIMIT ? OFFSET ?`,
			[limit, offset],
		);

		return rows;
	}

	return {
		count,
		findBySlug,
		list,
		listPage,
	};
}
