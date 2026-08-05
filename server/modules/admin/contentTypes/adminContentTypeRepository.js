export default function createAdminContentTypeRepository(db) {
	async function get(contentType, { ownerUserId = null } = {}) {
		const ownerClause = ownerUserId === null ? '' : 'AND posts.owner_user_id = ?';
		const parameters = ownerUserId === null ? [contentType] : [contentType, ownerUserId];
		const [[type], [posts], [categories], [tags]] = await Promise.all([
			db.execute(`SELECT slug, label, archive_seo_title, archive_seo_description FROM content_types WHERE slug = ? AND is_enabled = 1`, [
				contentType,
			]),
			db.execute(
				`SELECT posts.id, posts.status, posts.updated_at, posts.published_at,
				        post_revisions.title, route_slugs.slug, authors.display_name AS author
				 FROM posts
				 INNER JOIN post_revision_heads ON post_revision_heads.post_id = posts.id
				 INNER JOIN post_revisions ON post_revisions.id = post_revision_heads.current_revision_id
				 INNER JOIN route_slugs ON route_slugs.resource_type = 'post' AND route_slugs.resource_id = posts.id AND route_slugs.kind = 'canonical'
				 INNER JOIN authors ON authors.id = posts.author_id
				 WHERE posts.content_type = ? AND posts.trashed_at IS NULL ${ownerClause}
				 ORDER BY posts.updated_at DESC, posts.id DESC`,
				parameters,
			),
			db.execute(
				`SELECT categories.id, categories.name, categories.description, route_slugs.slug,
				        COUNT(post_categories.post_id) AS post_count
				 FROM categories
				 INNER JOIN route_slugs ON route_slugs.resource_type = 'category' AND route_slugs.resource_id = categories.id AND route_slugs.kind = 'canonical'
				 LEFT JOIN post_categories ON post_categories.category_id = categories.id
				 WHERE categories.content_type = ?
				 GROUP BY categories.id, categories.name, categories.description, route_slugs.slug
				 ORDER BY categories.name`,
				[contentType],
			),
			db.execute(
				`SELECT tags.id, tags.name, COUNT(post_tags.post_id) AS post_count
				 FROM tags
				 LEFT JOIN post_tags ON post_tags.tag_id = tags.id
				 WHERE tags.content_type = ?
				 GROUP BY tags.id, tags.name
				 ORDER BY tags.name`,
				[contentType],
			),
		]);

		if (!type[0]) return null;
		return {
			archiveSeo: { description: type[0].archive_seo_description, title: type[0].archive_seo_title },
			categories: categories.map((category) => ({ ...category, id: Number(category.id), post_count: Number(category.post_count) })),
			contentType: { label: type[0].label, slug: type[0].slug },
			posts: posts.map((post) => ({ ...post, id: Number(post.id) })),
			tags: tags.map((tag) => ({ ...tag, id: Number(tag.id), post_count: Number(tag.post_count) })),
		};
	}

	async function createCategory(contentType, category) {
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [result] = await connection.execute(
				`INSERT INTO categories (content_type, name, normalized_name, description) VALUES (?, ?, ?, ?)`,
				[contentType, category.name, category.name.toLocaleLowerCase(), category.description || null],
			);
			await connection.execute(`INSERT INTO route_slugs (resource_type, resource_id, slug, kind) VALUES ('category', ?, ?, 'canonical')`, [
				result.insertId,
				category.slug,
			]);
			await connection.commit();
			return { id: Number(result.insertId), ...category };
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	async function updateArchiveSeo(contentType, seo) {
		const [result] = await db.execute(
			`UPDATE content_types SET archive_seo_title = ?, archive_seo_description = ? WHERE slug = ? AND is_enabled = 1`,
			[seo.title || null, seo.description || null, contentType],
		);
		return result.affectedRows > 0;
	}

	async function createTag(contentType, tag) {
		const [result] = await db.execute(`INSERT INTO tags (content_type, name, normalized_name) VALUES (?, ?, ?)`, [
			contentType,
			tag.name,
			tag.name.toLocaleLowerCase(),
		]);
		return { id: Number(result.insertId), name: tag.name };
	}

	return { createCategory, createTag, get, updateArchiveSeo };
}
