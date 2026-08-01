export default function createDeleteAccountRepository(db) {
	async function withConnection(callback) {
		const connection = await db.getConnection();

		try {
			return await callback(connection);
		} finally {
			connection.release();
		}
	}

	async function findActiveUserForUpdate(userId, executor = db) {
		const [users] = await executor.execute(
			`
				SELECT
					id,
					password_hash
				FROM users
				WHERE id = ?
					AND status = 'active'
					AND deleted_at IS NULL
					AND password_hash IS NOT NULL
				LIMIT 1
				FOR UPDATE
			`,
			[userId],
		);

		return users[0] ?? null;
	}

	async function findTotpForUpdate(userId, executor = db) {
		const [records] = await executor.execute(
			`
				SELECT
					user_id,
					secret_encrypted,
					algorithm,
					digits,
					period,
					is_enabled,
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

	async function deleteEmailVerificationTokens(userId, executor = db) {
		const [result] = await executor.execute(
			`
				DELETE FROM email_verification_tokens
				WHERE user_id = ?
			`,
			[userId],
		);

		return result.affectedRows;
	}

	async function deletePasswordResetTokens(userId, executor = db) {
		const [result] = await executor.execute(
			`
				DELETE FROM password_reset_tokens
				WHERE user_id = ?
			`,
			[userId],
		);

		return result.affectedRows;
	}

	async function deleteAuthIdentities(userId, executor = db) {
		const [result] = await executor.execute(
			`
				DELETE FROM auth_identities
				WHERE user_id = ?
			`,
			[userId],
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

	async function softDeleteUser(userId, executor = db) {
		const [result] = await executor.execute(
			`
				UPDATE users
				SET
					status = 'deleted',
					password_hash = NULL,
					deleted_at = CURRENT_TIMESTAMP(3)
				WHERE id = ?
					AND status = 'active'
					AND deleted_at IS NULL
			`,
			[userId],
		);

		return result.affectedRows;
	}

	async function deleteUserSessions(userId, executor = db) {
		const [result] = await executor.execute(
			`
				DELETE FROM sessions
				WHERE JSON_VALID(data) = 1
					AND CAST(
						JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))
						AS UNSIGNED
					) = ?
			`,
			[userId],
		);

		return result.affectedRows;
	}
	return {
		withConnection,
		findActiveUserForUpdate,
		findTotpForUpdate,
		findUnusedRecoveryCodeForUpdate,
		deleteEmailVerificationTokens,
		deletePasswordResetTokens,
		deleteAuthIdentities,
		deleteRecoveryCodes,
		deleteTotp,
		softDeleteUser,
		deleteUserSessions,
	};
}
