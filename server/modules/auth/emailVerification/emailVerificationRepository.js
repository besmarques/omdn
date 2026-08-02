export default function createEmailVerificationRepository(db) {
	async function findPendingUnverifiedUserByEmail(email, executor = db) {
		const [users] = await executor.execute(
			`
				SELECT id
				FROM users
				WHERE email = ?
					AND status = 'pending'
					AND email_verified_at IS NULL
				LIMIT 1
			`,
			[email],
		);

		return users[0] ?? null;
	}

	async function createEmailVerificationToken(userId, tokenHash, executor = db) {
		await executor.execute(
			`
				INSERT INTO email_verification_tokens (
					user_id,
					token_hash,
					expires_at
				)
				VALUES (
					?,
					?,
					DATE_ADD(
						CURRENT_TIMESTAMP(3),
						INTERVAL 24 HOUR
					)
				)
			`,
			[userId, tokenHash],
		);
	}

	async function deleteUnusedEmailVerificationTokens(userId, executor = db) {
		await executor.execute(
			`
				DELETE FROM email_verification_tokens
				WHERE user_id = ?
					AND used_at IS NULL
			`,
			[userId],
		);
	}

	async function findValidEmailVerificationByTokenHash(tokenHash, executor = db) {
		const [tokens] = await executor.execute(
			`
				SELECT
					email_verification_tokens.id,
					email_verification_tokens.user_id,
					users.status
				FROM email_verification_tokens
				INNER JOIN users
					ON users.id =
						email_verification_tokens.user_id
				WHERE email_verification_tokens.token_hash = ?
					AND email_verification_tokens.used_at IS NULL
					AND email_verification_tokens.expires_at
						> CURRENT_TIMESTAMP(3)
				LIMIT 1
				FOR UPDATE
			`,
			[tokenHash],
		);

		return tokens[0] ?? null;
	}

	async function activateVerifiedUser(userId, executor = db) {
		await executor.execute(
			`
				UPDATE users
				SET
					status = 'active',
					email_verified_at = COALESCE(
						email_verified_at,
						CURRENT_TIMESTAMP(3)
					)
				WHERE id = ?
					AND status IN ('pending', 'active')
			`,
			[userId],
		);
	}

	async function markEmailVerificationTokensUsed(userId, executor = db) {
		await executor.execute(
			`
				UPDATE email_verification_tokens
				SET used_at = CURRENT_TIMESTAMP(3)
				WHERE user_id = ?
					AND used_at IS NULL
			`,
			[userId],
		);
	}

	return {
		findPendingUnverifiedUserByEmail,
		createEmailVerificationToken,
		deleteUnusedEmailVerificationTokens,
		findValidEmailVerificationByTokenHash,
		activateVerifiedUser,
		markEmailVerificationTokensUsed,
	};
}
