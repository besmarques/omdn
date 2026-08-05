export default function createRecipeRepository(db) {
	return async function createRecipe(record) {
		const connection = await db.getConnection();

		try {
			await connection.beginTransaction();
			const [authorResult] = await connection.execute(
				`INSERT INTO authors (user_id, display_name)
				 VALUES (?, ?)
				 ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
				[record.actor.id, record.actor.displayName],
			);
			const [postResult] = await connection.execute(
				`INSERT INTO posts (
					owner_user_id, author_id, content_type, status, visibility, published_at
				 ) VALUES (?, ?, 'recipe', ?, 'public', ?)`,
				[record.actor.id, authorResult.insertId, record.publish ? 'published' : 'draft', record.publish ? record.createdAt : null],
			);
			const [revisionResult] = await connection.execute(
				`INSERT INTO post_revisions (
					post_id, revision_number, created_by_user_id, title, excerpt,
					seo_title, seo_description, layout_key, template_key, header_key,
					footer_key, region_config, source, source_schema_version,
					render_version, plain_text, source_sha256
				 ) VALUES (?, 1, ?, ?, ?, ?, ?, 'full-width', 'recipe', 'minimal',
					'standard', ?, ?, 1, 1, ?, ?)`,
				[
					postResult.insertId,
					record.actor.id,
					record.source.title,
					record.source.description,
					record.seoTitle,
					record.source.description,
					JSON.stringify({ sidebar: [] }),
					JSON.stringify(record.source),
					record.plainText,
					record.sourceHash,
				],
			);

			await connection.execute(
				`INSERT INTO post_revision_heads (post_id, current_revision_id, published_revision_id)
				 VALUES (?, ?, ?)`,
				[postResult.insertId, revisionResult.insertId, record.publish ? revisionResult.insertId : null],
			);
			await connection.execute(
				`INSERT INTO route_slugs (resource_type, resource_id, slug, kind)
				 VALUES ('post', ?, ?, 'canonical')`,
				[postResult.insertId, record.slug],
			);
			const [outboxResult] = await connection.execute(
				`INSERT INTO domain_outbox (aggregate_type, aggregate_id, event_type, payload)
				 VALUES ('post', ?, ?, ?)`,
				[
					postResult.insertId,
					record.publish ? 'recipe_published' : 'recipe_created',
					JSON.stringify({ postId: Number(postResult.insertId), revisionId: Number(revisionResult.insertId), slug: record.slug }),
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
					record.publish ? 'recipe_published' : 'recipe_created',
					JSON.stringify({ slug: record.slug }),
				],
			);

			await connection.commit();

			return { id: Number(postResult.insertId), published: record.publish, slug: record.slug };
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	};
}
