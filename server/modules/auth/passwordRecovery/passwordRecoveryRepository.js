export default function createPasswordRecoveryRepository(db) {
	async function findPasswordResetUserByEmail(email, executor = db) {
		const [users] = await executor.execute(
			`
			SELECT id
			FROM users
			WHERE email = ?
				AND status = 'active'
				AND email_verified_at IS NOT NULL
				AND password_hash IS NOT NULL
				AND deleted_at IS NULL
			LIMIT 1
		`,
			[email],
		);

		return users[0] ?? null;
	}

	async function deleteUnusedPasswordResetTokens(userId, executor = db) {
		await executor.execute(
			`
			DELETE FROM password_reset_tokens
			WHERE user_id = ?
				AND used_at IS NULL
		`,
			[userId],
		);
	}

	async function createPasswordResetToken(userId, tokenHash, executor = db) {
		await executor.execute(
			`
			INSERT INTO password_reset_tokens (
				user_id,
				token_hash,
				expires_at
			)
			VALUES (
				?,
				?,
				DATE_ADD(
					CURRENT_TIMESTAMP(3),
					INTERVAL 1 HOUR
				)
			)
		`,
			[userId, tokenHash],
		);
	}

	async function findValidPasswordResetByTokenHash(tokenHash, executor = db) {
		const [tokens] = await executor.execute(
			`
			SELECT
				password_reset_tokens.id,
				password_reset_tokens.user_id
			FROM password_reset_tokens
			INNER JOIN users
				ON users.id =
					password_reset_tokens.user_id
			WHERE password_reset_tokens.token_hash = ?
				AND password_reset_tokens.used_at IS NULL
				AND password_reset_tokens.expires_at
					> CURRENT_TIMESTAMP(3)
				AND users.status = 'active'
				AND users.email_verified_at IS NOT NULL
				AND users.password_hash IS NOT NULL
				AND users.deleted_at IS NULL
			LIMIT 1
		`,
			[tokenHash],
		);

		return tokens[0] ?? null;
	}

	async function findValidPasswordResetByTokenHashForUpdate(tokenHash, executor = db) {
		const [tokens] = await executor.execute(
			`
			SELECT
				password_reset_tokens.id,
				password_reset_tokens.user_id
			FROM password_reset_tokens
			INNER JOIN users
				ON users.id = password_reset_tokens.user_id
			WHERE password_reset_tokens.token_hash = ?
				AND password_reset_tokens.used_at IS NULL
				AND password_reset_tokens.expires_at > CURRENT_TIMESTAMP(3)
				AND users.status = 'active'
				AND users.email_verified_at IS NOT NULL
				AND users.password_hash IS NOT NULL
				AND users.deleted_at IS NULL
			LIMIT 1
			FOR UPDATE
		`,
			[tokenHash],
		);

		return tokens[0] ?? null;
	}

	async function markPasswordResetTokensUsed(userId, executor = db) {
		await executor.execute(
			`
			UPDATE password_reset_tokens
			SET used_at = CURRENT_TIMESTAMP(3)
			WHERE user_id = ?
				AND used_at IS NULL
		`,
			[userId],
		);
	}

	return {
		findPasswordResetUserByEmail,
		deleteUnusedPasswordResetTokens,
		createPasswordResetToken,
		findValidPasswordResetByTokenHash,
		findValidPasswordResetByTokenHashForUpdate,
		markPasswordResetTokensUsed,
	};
}
