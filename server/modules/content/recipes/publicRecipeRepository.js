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
		post_revisions.id AS revision_id,
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
	async function attachMedia(rows) {
		if (rows.length === 0) return rows;
		const revisionIds = [...new Set(rows.map(({ revision_id: id }) => id))];
		const placeholders = revisionIds.map(() => '?').join(', ');
		const [media] = await db.execute(
			`SELECT post_revision_media.revision_id, post_revision_media.role, post_revision_media.sort_position,
			        post_revision_media.alt_text, media_assets.uuid, media_assets.width, media_assets.height,
			        media_variants.variant_name, media_variants.width AS variant_width, media_variants.height AS variant_height
			 FROM post_revision_media
			 INNER JOIN media_assets ON media_assets.id = post_revision_media.media_asset_id AND media_assets.status = 'ready'
			 INNER JOIN media_variants ON media_variants.media_asset_id = media_assets.id
			 WHERE post_revision_media.revision_id IN (${placeholders})
			 ORDER BY post_revision_media.revision_id, post_revision_media.role, post_revision_media.sort_position, media_variants.width`,
			revisionIds,
		);
		return rows.map((row) => ({ ...row, media: media.filter(({ revision_id: id }) => Number(id) === Number(row.revision_id)) }));
	}
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

		const [row] = await attachMedia([rows[0]]);
		return {
			...row,
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

		return attachMedia(rows);
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

		return attachMedia(rows);
	}

	return {
		count,
		findBySlug,
		list,
		listPage,
	};
}
