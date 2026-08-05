export default function createEditPostRepository(db) {
	async function findById(contentType, id, { includeTrashed = false } = {}) {
		const [[post]] = await db.execute(
			`SELECT posts.id, posts.owner_user_id, posts.status, posts.lock_version, posts.is_pillar_content,
			        route_slugs.slug, post_revisions.title, post_revisions.excerpt,
			        post_revisions.seo_title, post_revisions.seo_description,
			        post_revisions.focus_keyword, post_revisions.source,
			        posts.primary_category_id
			 FROM posts
			 INNER JOIN post_revision_heads ON post_revision_heads.post_id = posts.id
			 INNER JOIN post_revisions ON post_revisions.id = post_revision_heads.current_revision_id
			 INNER JOIN route_slugs ON route_slugs.resource_type = 'post' AND route_slugs.resource_id = posts.id AND route_slugs.kind = 'canonical'
			 WHERE posts.id = ? AND posts.content_type = ? ${includeTrashed ? '' : 'AND posts.trashed_at IS NULL'}`,
			[id, contentType],
		);
		if (!post) return null;
		const [tags] = await db.execute(`SELECT tag_id FROM post_tags WHERE post_id = ? ORDER BY tag_id`, [id]);
		return {
			...post,
			id: Number(post.id),
			lock_version: Number(post.lock_version),
			is_pillar_content: Boolean(post.is_pillar_content),
			owner_user_id: Number(post.owner_user_id),
			primary_category_id: post.primary_category_id ? Number(post.primary_category_id) : null,
			source: typeof post.source === 'string' ? JSON.parse(post.source) : post.source,
			tag_ids: tags.map(({ tag_id: tagId }) => Number(tagId)),
		};
	}

	async function update(record) {
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [[post]] = await connection.execute(
				`SELECT posts.lock_version, posts.status, post_revision_heads.current_revision_id,
				        post_revision_heads.published_revision_id, post_revisions.revision_number,
				        post_revisions.layout_key, post_revisions.template_key, post_revisions.header_key,
				        post_revisions.footer_key, post_revisions.region_config, post_revisions.render_version
				 FROM posts
				 INNER JOIN post_revision_heads ON post_revision_heads.post_id = posts.id
				 INNER JOIN post_revisions ON post_revisions.id = post_revision_heads.current_revision_id
				 WHERE posts.id = ? AND posts.content_type = ? FOR UPDATE`,
				[record.id, record.contentType],
			);
			if (!post) throw Object.assign(new Error('Post not found'), { code: 'POST_NOT_FOUND' });
			if (Number(post.lock_version) !== record.expectedLockVersion)
				throw Object.assign(new Error('This post was changed by another editor. Reload before saving.'), { code: 'EDIT_CONFLICT' });

			if (record.categoryId) {
				const [[category]] = await connection.execute(`SELECT id FROM categories WHERE id = ? AND content_type = ?`, [
					record.categoryId,
					record.contentType,
				]);
				if (!category) throw new RangeError('The selected category belongs to another content type');
			}
			if (record.tagIds.length > 0) {
				const placeholders = record.tagIds.map(() => '?').join(', ');
				const [tags] = await connection.execute(`SELECT id FROM tags WHERE content_type = ? AND id IN (${placeholders})`, [
					record.contentType,
					...record.tagIds,
				]);
				if (tags.length !== new Set(record.tagIds).size) throw new RangeError('One or more selected tags belong to another content type');
			}

			const [revision] = await connection.execute(
				`INSERT INTO post_revisions (
					post_id, revision_number, created_by_user_id, title, excerpt, seo_title,
					seo_description, focus_keyword, layout_key, template_key, header_key,
					footer_key, region_config, source, source_schema_version, render_version,
					plain_text, source_sha256
				 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
				[
					record.id,
					Number(post.revision_number) + 1,
					record.actor.id,
					record.source.title,
					record.excerpt,
					record.seo.title,
					record.seo.description,
					record.seo.focusKeyword,
					post.layout_key,
					post.template_key,
					post.header_key,
					post.footer_key,
					post.region_config,
					JSON.stringify(record.source),
					post.render_version,
					record.plainText,
					record.sourceHash,
				],
			);
			const published = post.status === 'published';
			await connection.execute(
				`UPDATE post_revision_heads SET current_revision_id = ?, published_revision_id = CASE WHEN ? THEN ? ELSE published_revision_id END WHERE post_id = ?`,
				[revision.insertId, published, revision.insertId, record.id],
			);
			await connection.execute(
				`UPDATE posts SET primary_category_id = ?, is_pillar_content = ?, lock_version = lock_version + 1 WHERE id = ?`,
				[record.categoryId || null, record.isPillar, record.id],
			);
			await connection.execute(`DELETE FROM post_categories WHERE post_id = ?`, [record.id]);
			if (record.categoryId)
				await connection.execute(`INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)`, [record.id, record.categoryId]);
			await connection.execute(`DELETE FROM post_tags WHERE post_id = ?`, [record.id]);
			for (const tagId of new Set(record.tagIds))
				await connection.execute(`INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)`, [record.id, tagId]);

			const [[canonical]] = await connection.execute(
				`SELECT id, slug FROM route_slugs WHERE resource_type = 'post' AND resource_id = ? AND kind = 'canonical' FOR UPDATE`,
				[record.id],
			);
			if (canonical.slug !== record.slug) {
				await connection.execute(`UPDATE route_slugs SET kind = 'redirect' WHERE id = ?`, [canonical.id]);
				await connection.execute(`INSERT INTO route_slugs (resource_type, resource_id, slug, kind) VALUES ('post', ?, ?, 'canonical')`, [
					record.id,
					record.slug,
				]);
			}
			await connection.commit();
			return { id: record.id, lockVersion: record.expectedLockVersion + 1, slug: record.slug };
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}
	return { findById, update };
}
