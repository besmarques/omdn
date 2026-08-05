export default function createPostLifecycleRepository(db) {
	async function transition({ action, actorId, contentType, expectedLockVersion, id, publishAt }) {
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [[post]] = await connection.execute(
				`SELECT posts.owner_user_id, posts.status, posts.lock_version,
				        post_revision_heads.current_revision_id, post_revision_heads.published_revision_id
				 FROM posts
				 INNER JOIN post_revision_heads ON post_revision_heads.post_id = posts.id
				 WHERE posts.id = ? AND posts.content_type = ? FOR UPDATE`,
				[id, contentType],
			);
			if (!post) return await rollbackAndReturn(connection, null);
			if (Number(post.lock_version) !== expectedLockVersion)
				throw Object.assign(new Error('This post was changed by another editor. Reload before trying again.'), { code: 'EDIT_CONFLICT' });

			const allowed = {
				publish: ['draft', 'in_review', 'scheduled', 'archived'],
				restore: ['trashed'],
				schedule: ['draft', 'in_review', 'scheduled', 'archived'],
				trash: ['draft', 'in_review', 'scheduled', 'published', 'archived'],
				unpublish: ['published'],
			};
			if (!allowed[action]?.includes(post.status))
				throw Object.assign(new Error(`A ${post.status} post cannot be ${action === 'unpublish' ? 'unpublished' : `${action}d`}.`), {
					code: 'INVALID_TRANSITION',
				});

			if (['publish', 'schedule', 'trash', 'unpublish'].includes(action)) {
				await connection.execute(
					`UPDATE publication_schedules
					 SET status = 'cancelled', processed_at = CURRENT_TIMESTAMP(3), last_error = 'Cancelled by editorial action'
					 WHERE post_id = ? AND status IN ('pending', 'processing')`,
					[id],
				);
			}

			if (action === 'publish') {
				await connection.execute(
					`UPDATE posts SET status = 'published', published_at = CURRENT_TIMESTAMP(3),
					 archived_at = NULL, trashed_at = NULL, lock_version = lock_version + 1 WHERE id = ?`,
					[id],
				);
				await connection.execute(`UPDATE post_revision_heads SET published_revision_id = current_revision_id WHERE post_id = ?`, [id]);
			} else if (action === 'schedule') {
				await connection.execute(
					`INSERT INTO publication_schedules (post_id, revision_id, publish_at, available_at, created_by_user_id)
					 VALUES (?, ?, ?, ?, ?)`,
					[id, post.current_revision_id, publishAt, publishAt, actorId],
				);
				await connection.execute(
					`UPDATE posts SET status = 'scheduled', archived_at = NULL, trashed_at = NULL, lock_version = lock_version + 1 WHERE id = ?`,
					[id],
				);
			} else if (action === 'unpublish') {
				await connection.execute(
					`UPDATE posts SET status = 'archived', archived_at = CURRENT_TIMESTAMP(3), lock_version = lock_version + 1 WHERE id = ?`,
					[id],
				);
			} else if (action === 'trash') {
				await connection.execute(
					`UPDATE posts SET status = 'trashed', trashed_at = CURRENT_TIMESTAMP(3), lock_version = lock_version + 1 WHERE id = ?`,
					[id],
				);
			} else {
				await connection.execute(
					`UPDATE posts SET status = 'draft', trashed_at = NULL, archived_at = NULL, lock_version = lock_version + 1 WHERE id = ?`,
					[id],
				);
			}

			const eventType = `${contentType}_${action === 'unpublish' ? 'unpublished' : action === 'trash' ? 'trashed' : `${action}d`}`;
			const metadata = JSON.stringify({ action, from: post.status, postId: Number(id), ...(publishAt ? { publishAt } : {}) });
			const [outbox] = await connection.execute(
				`INSERT INTO domain_outbox (aggregate_type, aggregate_id, event_type, payload) VALUES ('post', ?, ?, ?)`,
				[id, eventType, metadata],
			);
			await connection.execute(
				`INSERT INTO content_events (outbox_id, post_id, revision_id, actor_user_id, event_type, metadata)
				 VALUES (?, ?, ?, ?, ?, ?)`,
				[outbox.insertId, id, post.current_revision_id, actorId, eventType, metadata],
			);
			await connection.commit();
			return {
				id: Number(id),
				lockVersion: expectedLockVersion + 1,
				status:
					action === 'unpublish'
						? 'archived'
						: action === 'restore'
							? 'draft'
							: action === 'trash'
								? 'trashed'
								: action === 'schedule'
									? 'scheduled'
									: 'published',
			};
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	return { transition };
}

async function rollbackAndReturn(connection, value) {
	await connection.rollback();
	return value;
}
