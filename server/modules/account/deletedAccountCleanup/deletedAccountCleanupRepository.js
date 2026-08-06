function createPlaceholders(values) {
	return values.map(() => '?').join(', ');
}

export default function createDeletedAccountCleanupRepository(db) {
	return {
		async purgeExpiredDeletedUsers(batchSize = 100) {
			const connection = await db.getConnection();

			try {
				await connection.beginTransaction();

				const [users] = await connection.execute(
					`
						SELECT id
						FROM users
						WHERE status = 'deleted'
							AND deleted_at <= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 YEAR)
						ORDER BY deleted_at, id
						LIMIT ?
						FOR UPDATE SKIP LOCKED
					`,
					[batchSize],
				);

				const userIds = users.map((user) => user.id);

				if (userIds.length === 0) {
					await connection.commit();
					return 0;
				}

				const userPlaceholders = createPlaceholders(userIds);

				const [posts] = await connection.execute(
					`
						SELECT id
						FROM posts
						WHERE owner_user_id IN (${userPlaceholders})
						ORDER BY id
						FOR UPDATE
					`,
					userIds,
				);

				const postIds = posts.map((post) => post.id);

				if (postIds.length > 0) {
					const postPlaceholders = createPlaceholders(postIds);

					await connection.execute(
						`
							DELETE FROM publication_schedules
							WHERE post_id IN (${postPlaceholders})
						`,
						postIds,
					);

					await connection.execute(
						`
							DELETE FROM post_categories
							WHERE post_id IN (${postPlaceholders})
						`,
						postIds,
					);

					await connection.execute(
						`
							DELETE FROM post_tags
							WHERE post_id IN (${postPlaceholders})
						`,
						postIds,
					);

					await connection.execute(
						`
							DELETE FROM route_slugs
							WHERE resource_type = 'post'
								AND resource_id IN (${postPlaceholders})
						`,
						postIds,
					);

					await connection.execute(
						`
							DELETE FROM post_revision_heads
							WHERE post_id IN (${postPlaceholders})
						`,
						postIds,
					);

					await connection.execute(
						`
							DELETE FROM posts
							WHERE id IN (${postPlaceholders})
						`,
						postIds,
					);
				}

				const [authors] = await connection.execute(
					`
						SELECT id
						FROM authors
						WHERE user_id IN (${userPlaceholders})
						ORDER BY id
						FOR UPDATE
					`,
					userIds,
				);

				const authorIds = authors.map((author) => author.id);

				if (authorIds.length > 0) {
					const authorPlaceholders = createPlaceholders(authorIds);

					await connection.execute(
						`
							DELETE FROM route_slugs
							WHERE resource_type = 'author'
								AND resource_id IN (${authorPlaceholders})
						`,
						authorIds,
					);
				}

				await connection.execute(
					`
						DELETE FROM authors
						WHERE user_id IN (${userPlaceholders})
					`,
					userIds,
				);

				await connection.execute(
					`
		DELETE FROM sessions
		WHERE JSON_VALID(data) = 1
			AND CAST(
				JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))
				AS UNSIGNED
			) IN (${userPlaceholders})
	`,
					userIds,
				);

				await connection.execute(
					`
						DELETE FROM auth_event_outbox
						WHERE JSON_VALID(payload) = 1
							AND CAST(
								JSON_UNQUOTE(JSON_EXTRACT(payload, '$.userId'))
								AS UNSIGNED
							) IN (${userPlaceholders})
					`,
					userIds,
				);

				await connection.execute(
					`
						DELETE FROM auth_events
						WHERE user_id IN (${userPlaceholders})
					`,
					userIds,
				);

				const [result] = await connection.execute(
					`
						DELETE FROM users
						WHERE id IN (${userPlaceholders})
							AND status = 'deleted'
							AND deleted_at <= DATE_SUB(
								CURRENT_TIMESTAMP(3),
								INTERVAL 1 YEAR
							)
					`,
					userIds,
				);

				await connection.commit();

				return result.affectedRows;
			} catch (error) {
				await connection.rollback();
				throw error;
			} finally {
				connection.release();
			}
		},
	};
}
