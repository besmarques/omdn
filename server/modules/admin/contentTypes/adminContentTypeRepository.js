export default function createAdminContentTypeRepository(db) {
	async function get(contentType, { ownerUserId = null } = {}) {
		const ownerClause = ownerUserId === null ? '' : 'AND posts.owner_user_id = ?';
		const parameters = ownerUserId === null ? [contentType] : [contentType, ownerUserId];
		const [[type], [posts], [categories], [tags]] = await Promise.all([
			db.execute(`SELECT slug, label, archive_seo_title, archive_seo_description FROM content_types WHERE slug = ? AND is_enabled = 1`, [
				contentType,
			]),
			db.execute(
				`SELECT posts.id, posts.owner_user_id, posts.status, posts.lock_version, posts.updated_at, posts.published_at,
				        post_revisions.title, route_slugs.slug, authors.display_name AS author
				 FROM posts
				 INNER JOIN post_revision_heads ON post_revision_heads.post_id = posts.id
				 INNER JOIN post_revisions ON post_revisions.id = post_revision_heads.current_revision_id
				 INNER JOIN route_slugs ON route_slugs.resource_type = 'post' AND route_slugs.resource_id = posts.id AND route_slugs.kind = 'canonical'
				 INNER JOIN authors ON authors.id = posts.author_id
				 WHERE posts.content_type = ? ${ownerClause}
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
			posts: posts.map((post) => ({
				...post,
				id: Number(post.id),
				lock_version: Number(post.lock_version),
				owner_user_id: Number(post.owner_user_id),
			})),
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

	async function updateCategory(contentType, id, category) {
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [[current]] = await connection.execute(
				`SELECT categories.id, route_slugs.id AS slug_id, route_slugs.slug FROM categories INNER JOIN route_slugs ON route_slugs.resource_type = 'category' AND route_slugs.resource_id = categories.id AND route_slugs.kind = 'canonical' WHERE categories.id = ? AND categories.content_type = ? FOR UPDATE`,
				[id, contentType],
			);
			if (!current) {
				await connection.rollback();
				return null;
			}
			await connection.execute(
				`UPDATE categories SET name = ?, normalized_name = ?, description = ?, lock_version = lock_version + 1 WHERE id = ?`,
				[category.name, category.name.toLocaleLowerCase(), category.description || null, id],
			);
			if (current.slug !== category.slug) {
				await connection.execute(`UPDATE route_slugs SET kind = 'redirect' WHERE id = ?`, [current.slug_id]);
				await connection.execute(
					`INSERT INTO route_slugs (resource_type, resource_id, slug, kind) VALUES ('category', ?, ?, 'canonical')`,
					[id, category.slug],
				);
			}
			await connection.commit();
			return { id, ...category };
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	async function updateTag(contentType, id, tag) {
		const [result] = await db.execute(
			`UPDATE tags SET name = ?, normalized_name = ?, lock_version = lock_version + 1 WHERE id = ? AND content_type = ?`,
			[tag.name, tag.name.toLocaleLowerCase(), id, contentType],
		);
		return result.affectedRows ? { id, name: tag.name } : null;
	}

	async function deleteTaxonomy(contentType, taxonomy, id) {
		if (taxonomy === 'tags') {
			const [result] = await db.execute(`DELETE FROM tags WHERE id = ? AND content_type = ?`, [id, contentType]);
			return result.affectedRows > 0;
		}

		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [[category]] = await connection.execute(`SELECT id FROM categories WHERE id = ? AND content_type = ? FOR UPDATE`, [
				id,
				contentType,
			]);
			if (!category) {
				await connection.rollback();
				return false;
			}
			await connection.execute(`DELETE FROM route_slugs WHERE resource_type = 'category' AND resource_id = ?`, [id]);
			await connection.execute(`DELETE FROM categories WHERE id = ?`, [id]);
			await connection.commit();
			return true;
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	return { createCategory, createTag, deleteTaxonomy, get, updateArchiveSeo, updateCategory, updateTag };
}
