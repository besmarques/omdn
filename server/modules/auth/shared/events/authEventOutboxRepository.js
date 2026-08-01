import { normalizeAuthEvent } from '#server/modules/auth/shared/events/authEventRepository';

export default function createAuthEventOutboxRepository(db) {
	async function create(event) {
		const payload = JSON.stringify(normalizeAuthEvent(event));

		await db.execute('INSERT INTO auth_event_outbox (payload) VALUES (?)', [payload]);
	}

	async function claimNext(workerId, staleLockMs) {
		const connection = await db.getConnection();

		try {
			await connection.beginTransaction();

			const [[item]] = await connection.execute(
				`SELECT id, payload, attempts
				 FROM auth_event_outbox
				 WHERE processed_at IS NULL
				   AND available_at <= CURRENT_TIMESTAMP(3)
				   AND (
					 locked_at IS NULL
					 OR locked_at <= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL ? MICROSECOND)
				   )
				 ORDER BY id
				 LIMIT 1
				 FOR UPDATE SKIP LOCKED`,
				[staleLockMs * 1000],
			);

			if (!item) {
				await connection.commit();
				return null;
			}

			await connection.execute(
				`UPDATE auth_event_outbox
				 SET locked_at = CURRENT_TIMESTAMP(3), locked_by = ?
				 WHERE id = ?`,
				[workerId, item.id],
			);

			await connection.commit();

			return {
				...item,
				payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
			};
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	async function complete(item, workerId, authEventRepository) {
		const connection = await db.getConnection();

		try {
			await connection.beginTransaction();

			await authEventRepository.create(item.payload, {
				executor: connection,
				outboxId: item.id,
			});

			const [result] = await connection.execute(
				`UPDATE auth_event_outbox
				 SET processed_at = CURRENT_TIMESTAMP(3),
					 payload = JSON_OBJECT(),
					 locked_at = NULL,
					 locked_by = NULL,
					 last_error = NULL
				 WHERE id = ? AND locked_by = ? AND processed_at IS NULL`,
				[item.id, workerId],
			);

			if (result.affectedRows !== 1) {
				throw new Error('Authentication event outbox claim was lost');
			}

			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	async function fail(item, workerId, error, retryDelayMs) {
		await db.execute(
			`UPDATE auth_event_outbox
			 SET attempts = attempts + 1,
				 available_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? MICROSECOND),
				 locked_at = NULL,
				 locked_by = NULL,
				 last_error = ?
			 WHERE id = ? AND locked_by = ? AND processed_at IS NULL`,
			[retryDelayMs * 1000, String(error?.message ?? error).slice(0, 1000), item.id, workerId],
		);
	}

	return {
		claimNext,
		complete,
		create,
		fail,
	};
}
