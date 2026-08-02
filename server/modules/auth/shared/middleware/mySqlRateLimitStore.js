import { createHash } from 'node:crypto';

function hashKey(key) {
	return createHash('sha256').update(key).digest();
}

export default function createMySqlRateLimitStore(db, namespace) {
	let windowMs;

	return {
		localKeys: false,
		prefix: namespace,

		init(options) {
			windowMs = options.windowMs;
		},

		async increment(key) {
			const connection = await db.getConnection();
			const keyHash = hashKey(key);

			try {
				await connection.beginTransaction();
				await connection.execute('DELETE FROM rate_limit_counters WHERE reset_at <= CURRENT_TIMESTAMP(3) LIMIT 100');
				await connection.execute(
					`INSERT INTO rate_limit_counters (namespace, key_hash, hits, reset_at)
					 VALUES (?, ?, 1, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL ? MICROSECOND))
					 ON DUPLICATE KEY UPDATE
					 hits = IF(reset_at <= CURRENT_TIMESTAMP(3), 1, hits + 1),
					 reset_at = IF(
						 reset_at <= CURRENT_TIMESTAMP(3),
						 VALUES(reset_at),
						 reset_at
					 )`,
					[namespace, keyHash, windowMs * 1000],
				);
				const [[counter]] = await connection.execute(
					`SELECT
						 hits,
						 GREATEST(
							 TIMESTAMPDIFF(MICROSECOND, CURRENT_TIMESTAMP(3), reset_at),
							 0
						 ) AS reset_after_microseconds
					 FROM rate_limit_counters
					 WHERE namespace = ? AND key_hash = ?
					 FOR UPDATE`,
					[namespace, keyHash],
				);
				await connection.commit();

				const resetAfterMilliseconds = Number(counter.reset_after_microseconds) / 1000;

				return {
					totalHits: Number(counter.hits),
					resetTime: new Date(Date.now() + resetAfterMilliseconds),
				};
			} catch (error) {
				await connection.rollback();
				throw error;
			} finally {
				connection.release();
			}
		},

		async decrement(key) {
			await db.execute(
				`UPDATE rate_limit_counters
				 SET hits = GREATEST(hits - 1, 0)
				 WHERE namespace = ? AND key_hash = ? AND reset_at > CURRENT_TIMESTAMP(3)`,
				[namespace, hashKey(key)],
			);
		},

		async resetKey(key) {
			await db.execute('DELETE FROM rate_limit_counters WHERE namespace = ? AND key_hash = ?', [namespace, hashKey(key)]);
		},
	};
}
