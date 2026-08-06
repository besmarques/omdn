export default function createPublicationScheduleRepository(db) {
	return {
		async publishNextDue() {
			const connection = await db.getConnection();

			try {
				await connection.beginTransaction();

				const [schedules] = await connection.execute(
					`SELECT
						ps.id,
						ps.post_id,
						ps.revision_id,
						ps.publish_at,
						ps.created_by_user_id,
						p.content_type
					 FROM publication_schedules ps
					 INNER JOIN posts p ON p.id = ps.post_id
					 WHERE ps.status = 'pending'
					   AND ps.available_at <= CURRENT_TIMESTAMP(3)
					 ORDER BY ps.available_at, ps.id
					 LIMIT 1
					 FOR UPDATE SKIP LOCKED`,
				);

				const schedule = schedules[0];

				if (!schedule) {
					await connection.commit();
					return false;
				}

				const eventType = `${schedule.content_type}_published`;

				const [postResult] = await connection.execute(
					`UPDATE posts
					 SET status = 'published',
					     published_at = ?,
					     archived_at = NULL
					 WHERE id = ?
					   AND status = 'scheduled'`,
					[schedule.publish_at, schedule.post_id],
				);

				if (postResult.affectedRows !== 1) {
					await connection.execute(
						`UPDATE publication_schedules
						 SET status = 'failed',
						     processed_at = CURRENT_TIMESTAMP(3),
						     last_error = 'Post is no longer scheduled'
						 WHERE id = ?`,
						[schedule.id],
					);

					await connection.commit();
					return true;
				}

				await connection.execute(
					`UPDATE post_revision_heads
					 SET published_revision_id = ?
					 WHERE post_id = ?`,
					[schedule.revision_id, schedule.post_id],
				);

				await connection.execute(
					`UPDATE publication_schedules
					 SET status = 'completed',
					     processed_at = CURRENT_TIMESTAMP(3),
					     attempts = attempts + 1
					 WHERE id = ?`,
					[schedule.id],
				);

				const outboxPayload = JSON.stringify({
					postId: Number(schedule.post_id),
					revisionId: Number(schedule.revision_id),
					scheduleId: Number(schedule.id),
				});

				const [outboxResult] = await connection.execute(
					`INSERT INTO domain_outbox (
						aggregate_type,
						aggregate_id,
						event_type,
						payload
					) VALUES ('post', ?, ?, ?)`,
					[schedule.post_id, eventType, outboxPayload],
				);

				await connection.execute(
					`INSERT INTO content_events (
						outbox_id,
						post_id,
						revision_id,
						actor_user_id,
						event_type,
						metadata
					) VALUES (?, ?, ?, ?, ?, ?)`,
					[
						outboxResult.insertId,
						schedule.post_id,
						schedule.revision_id,
						schedule.created_by_user_id,
						eventType,
						JSON.stringify({
							scheduleId: Number(schedule.id),
						}),
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
