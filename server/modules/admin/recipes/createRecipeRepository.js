export default function createRecipeRepository(db, { contentType = 'recipe', templateKey = 'recipe' } = {}) {
	return async function createRecipe(record) {
		const connection = await db.getConnection();

		try {
			await connection.beginTransaction();
			if (record.categoryId) {
				const [[category]] = await connection.execute(`SELECT id FROM categories WHERE id = ? AND content_type = ?`, [
					record.categoryId,
					contentType,
				]);
				if (!category) throw new RangeError(`The selected category does not belong to this ${contentType}`);
			}
			const tagIds = record.tagIds ?? [];
			if (tagIds.length > 0) {
				const placeholders = tagIds.map(() => '?').join(', ');
				const [tags] = await connection.execute(`SELECT id FROM tags WHERE content_type = ? AND id IN (${placeholders})`, [
					contentType,
					...tagIds,
				]);
				if (tags.length !== new Set(tagIds).size) throw new RangeError(`One or more selected tags do not belong to this ${contentType}`);
			}
			const published = record.publication === 'publish';
			const scheduled = record.publication === 'schedule';
			const [authorResult] = await connection.execute(
				`INSERT INTO authors (user_id, display_name)
				 VALUES (?, ?)
				 ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
				[record.actor.id, record.actor.displayName],
			);
			const [postResult] = await connection.execute(
				`INSERT INTO posts (
					owner_user_id, author_id, content_type, status, visibility, is_pillar_content, primary_category_id, published_at
				 ) VALUES (?, ?, ?, ?, 'public', ?, ?, ?)`,
				[
					record.actor.id,
					authorResult.insertId,
					contentType,
					published ? 'published' : scheduled ? 'scheduled' : 'draft',
					record.isPillar,
					record.categoryId || null,
					published ? record.createdAt : null,
				],
			);
			if (record.categoryId) {
				await connection.execute(`INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)`, [
					postResult.insertId,
					record.categoryId,
				]);
			}
			for (const tagId of new Set(tagIds)) {
				await connection.execute(`INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)`, [postResult.insertId, tagId]);
			}
			const [revisionResult] = await connection.execute(
				`INSERT INTO post_revisions (
					post_id, revision_number, created_by_user_id, title, excerpt,
					seo_title, seo_description, focus_keyword, layout_key, template_key, header_key,
					footer_key, region_config, source, source_schema_version,
					render_version, plain_text, source_sha256
				 ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'full-width', ?, 'minimal',
					'standard', ?, ?, 1, 1, ?, ?)`,
				[
					postResult.insertId,
					record.actor.id,
					record.source.title,
					record.excerpt,
					record.seo.title,
					record.seo.description,
					record.seo.focusKeyword,
					templateKey,
					JSON.stringify({ sidebar: [] }),
					JSON.stringify(record.source),
					record.plainText,
					record.sourceHash,
				],
			);

			await connection.execute(
				`INSERT INTO post_revision_heads (post_id, current_revision_id, published_revision_id)
				 VALUES (?, ?, ?)`,
				[postResult.insertId, revisionResult.insertId, published ? revisionResult.insertId : null],
			);
			await connection.execute(
				`INSERT INTO route_slugs (resource_type, resource_id, slug, kind)
				 VALUES ('post', ?, ?, 'canonical')`,
				[postResult.insertId, record.slug],
			);
			if (scheduled) {
				await connection.execute(
					`INSERT INTO publication_schedules (post_id, revision_id, publish_at, available_at, created_by_user_id)
					 VALUES (?, ?, ?, ?, ?)`,
					[postResult.insertId, revisionResult.insertId, record.publishAt, record.publishAt, record.actor.id],
				);
			}
			const eventType = published ? `${contentType}_published` : scheduled ? `${contentType}_scheduled` : `${contentType}_created`;
			const [outboxResult] = await connection.execute(
				`INSERT INTO domain_outbox (aggregate_type, aggregate_id, event_type, payload)
				 VALUES ('post', ?, ?, ?)`,
				[
					postResult.insertId,
					eventType,
					JSON.stringify({
						postId: Number(postResult.insertId),
						publishAt: record.publishAt?.toISOString() ?? null,
						revisionId: Number(revisionResult.insertId),
						slug: record.slug,
					}),
				],
			);
			await connection.execute(
				`INSERT INTO content_events (outbox_id, post_id, revision_id, actor_user_id, event_type, metadata)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[
					outboxResult.insertId,
					postResult.insertId,
					revisionResult.insertId,
					record.actor.id,
					eventType,
					JSON.stringify({ publishAt: record.publishAt?.toISOString() ?? null, slug: record.slug }),
				],
			);

			await connection.commit();

			return {
				id: Number(postResult.insertId),
				publication: record.publication,
				publishAt: record.publishAt?.toISOString() ?? null,
				slug: record.slug,
			};
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	};
}
