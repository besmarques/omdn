export default function createTotpRepository(db) {
	async function findTotpByUserId(userId, executor = db) {
		const [records] = await executor.execute(
			`
			SELECT
				user_id,
				secret_encrypted,
				algorithm,
				digits,
				period,
				is_enabled,
				verified_at,
				last_used_step
			FROM user_totp
			WHERE user_id = ?
			LIMIT 1
		`,
			[userId],
		);

		return records[0] ?? null;
	}

	async function findTotpByUserIdForUpdate(userId, executor = db) {
		const [records] = await executor.execute(
			`
			SELECT
				user_id,
				secret_encrypted,
				algorithm,
				digits,
				period,
				is_enabled,
				verified_at,
				last_used_step
			FROM user_totp
			WHERE user_id = ?
			LIMIT 1
			FOR UPDATE
		`,
			[userId],
		);

		return records[0] ?? null;
	}

	async function savePendingTotp(userId, secretEncrypted, executor = db) {
		await executor.execute(
			`
			INSERT INTO user_totp (
				user_id,
				secret_encrypted,
				algorithm,
				digits,
				period,
				is_enabled,
				verified_at,
				last_used_step
			)
			VALUES (
				?,
				?,
				'SHA1',
				6,
				30,
				0,
				NULL,
				NULL
			)
			ON DUPLICATE KEY UPDATE
				secret_encrypted = VALUES(secret_encrypted),
				algorithm = VALUES(algorithm),
				digits = VALUES(digits),
				period = VALUES(period),
				is_enabled = 0,
				verified_at = NULL,
				last_used_step = NULL
		`,
			[userId, secretEncrypted],
		);
	}

	async function enableTotp(userId, lastUsedStep, executor = db) {
		const [result] = await executor.execute(
			`
			UPDATE user_totp
			SET
				is_enabled = 1,
				verified_at = CURRENT_TIMESTAMP(3),
				last_used_step = ?
			WHERE user_id = ?
				AND is_enabled = 0
		`,
			[lastUsedStep, userId],
		);

		return result.affectedRows;
	}

	async function replaceRecoveryCodes(userId, codeHashes, executor = db) {
		await executor.execute(
			`
			DELETE FROM user_recovery_codes
			WHERE user_id = ?
		`,
			[userId],
		);

		if (codeHashes.length === 0) {
			return;
		}

		const placeholders = codeHashes.map(() => '(?, ?)').join(', ');

		const parameters = codeHashes.flatMap((codeHash) => [userId, codeHash]);

		await executor.execute(
			`
			INSERT INTO user_recovery_codes (
				user_id,
				code_hash
			)
			VALUES ${placeholders}
		`,
			parameters,
		);
	}

	async function updateTotpLastUsedStep(userId, timeStep, executor = db) {
		const [result] = await executor.execute(
			`
			UPDATE user_totp
			SET last_used_step = ?
			WHERE user_id = ?
				AND is_enabled = 1
				AND (
					last_used_step IS NULL
					OR last_used_step < ?
				)
		`,
			[timeStep, userId, timeStep],
		);

		return result.affectedRows;
	}

	async function findUnusedRecoveryCodeForUpdate(userId, codeHash, executor = db) {
		const [codes] = await executor.execute(
			`
			SELECT id
			FROM user_recovery_codes
			WHERE user_id = ?
				AND code_hash = ?
				AND used_at IS NULL
			LIMIT 1
			FOR UPDATE
		`,
			[userId, codeHash],
		);

		return codes[0] ?? null;
	}

	async function markRecoveryCodeUsed(recoveryCodeId, executor = db) {
		const [result] = await executor.execute(
			`
			UPDATE user_recovery_codes
			SET used_at = CURRENT_TIMESTAMP(3)
			WHERE id = ?
				AND used_at IS NULL
		`,
			[recoveryCodeId],
		);

		return result.affectedRows;
	}

	async function deleteRecoveryCodes(userId, executor = db) {
		const [result] = await executor.execute(
			`
			DELETE FROM user_recovery_codes
			WHERE user_id = ?
		`,
			[userId],
		);

		return result.affectedRows;
	}

	async function deleteTotp(userId, executor = db) {
		const [result] = await executor.execute(
			`
			DELETE FROM user_totp
			WHERE user_id = ?
		`,
			[userId],
		);

		return result.affectedRows;
	}

	return {
		findTotpByUserId,
		findTotpByUserIdForUpdate,
		savePendingTotp,
		enableTotp,
		replaceRecoveryCodes,
		updateTotpLastUsedStep,
		findUnusedRecoveryCodeForUpdate,
		markRecoveryCodeUsed,
		deleteRecoveryCodes,
		deleteTotp,
	};
}
