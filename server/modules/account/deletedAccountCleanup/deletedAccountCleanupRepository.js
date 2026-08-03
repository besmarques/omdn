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

				const placeholders = createPlaceholders(userIds);

				await connection.execute(
					`
						DELETE FROM sessions
						WHERE JSON_VALID(data) = 1
							AND CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId')) AS UNSIGNED)
								IN (${placeholders})
					`,
					userIds,
				);

				await connection.execute(
					`
						DELETE FROM auth_event_outbox
						WHERE JSON_VALID(payload) = 1
							AND CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.userId')) AS UNSIGNED)
								IN (${placeholders})
					`,
					userIds,
				);

				await connection.execute(`DELETE FROM auth_events WHERE user_id IN (${placeholders})`, userIds);

				const [result] = await connection.execute(
					`
						DELETE FROM users
						WHERE id IN (${placeholders})
							AND status = 'deleted'
							AND deleted_at <= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 YEAR)
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
