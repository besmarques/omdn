export default function createPublicationScheduleRepository(db) {
	return {
		async publishNextDue() {
			const connection = await db.getConnection();

			try {
				await connection.beginTransaction();
				const [schedules] = await connection.execute(
					`SELECT id, post_id, revision_id, publish_at, created_by_user_id
					 FROM publication_schedules
					 WHERE status = 'pending' AND available_at <= CURRENT_TIMESTAMP(3)
					 ORDER BY available_at, id
					 LIMIT 1
					 FOR UPDATE SKIP LOCKED`,
				);
				const schedule = schedules[0];

				if (!schedule) {
					await connection.commit();
					return false;
				}

				const [postResult] = await connection.execute(
					`UPDATE posts
					 SET status = 'published', published_at = ?, archived_at = NULL
					 WHERE id = ? AND status = 'scheduled'`,
					[schedule.publish_at, schedule.post_id],
				);

				if (postResult.affectedRows !== 1) {
					await connection.execute(
						`UPDATE publication_schedules
						 SET status = 'failed', processed_at = CURRENT_TIMESTAMP(3), last_error = 'Post is no longer scheduled'
						 WHERE id = ?`,
						[schedule.id],
					);
					await connection.commit();
					return true;
				}

				await connection.execute('UPDATE post_revision_heads SET published_revision_id = ? WHERE post_id = ?', [
					schedule.revision_id,
					schedule.post_id,
				]);
				await connection.execute(
					`UPDATE publication_schedules
					 SET status = 'completed', processed_at = CURRENT_TIMESTAMP(3), attempts = attempts + 1
					 WHERE id = ?`,
					[schedule.id],
				);
				const [outboxResult] = await connection.execute(
					`INSERT INTO domain_outbox (aggregate_type, aggregate_id, event_type, payload)
					 VALUES ('post', ?, 'recipe_published', ?)`,
					[
						schedule.post_id,
						JSON.stringify({ postId: Number(schedule.post_id), revisionId: Number(schedule.revision_id), scheduleId: Number(schedule.id) }),
					],
				);
				await connection.execute(
					`INSERT INTO content_events (outbox_id, post_id, revision_id, actor_user_id, event_type, metadata)
					 VALUES (?, ?, ?, ?, 'recipe_published', ?)`,
					[
						outboxResult.insertId,
						schedule.post_id,
						schedule.revision_id,
						schedule.created_by_user_id,
						JSON.stringify({ scheduleId: Number(schedule.id) }),
					],
				);

				await connection.commit();
				return true;
			} catch (error) {
				await connection.rollback();
				throw error;
			} finally {
				connection.release();
			}
		},
	};
}
