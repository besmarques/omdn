export default function createAuthRepository(db) {
	async function withConnection(callback) {
		const connection = await db.getConnection();

		try {
			return await callback(connection);
		} finally {
			connection.release();
		}
	}

	async function findExistingUserByEmail(
		email,
		executor = db,
	) {
		const [users] = await executor.execute(
			`
				SELECT id
				FROM users
				WHERE email = ?
				LIMIT 1
			`,
			[email],
		);

		return users[0] ?? null;
	}

	async function findPendingUnverifiedUserByEmail(
		email,
		executor = db,
	) {
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

	async function createPendingUser(
		{ email, displayName, passwordHash },
		executor = db,
	) {
		const [result] = await executor.execute(
			`
				INSERT INTO users (
					email,
					display_name,
					password_hash,
					status
				)
				VALUES (?, ?, ?, 'pending')
			`,
			[email, displayName, passwordHash],
		);

		return result.insertId;
	}

	async function assignSubscriberRole(
		userId,
		executor = db,
	) {
		const [result] = await executor.execute(
			`
				INSERT INTO user_roles (
					user_id,
					role_id
				)
				SELECT ?, id
				FROM roles
				WHERE slug = 'subscriber'
			`,
			[userId],
		);

		return result.affectedRows;
	}

	async function createEmailVerificationToken(
		userId,
		tokenHash,
		executor = db,
	) {
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

	async function deleteUnusedEmailVerificationTokens(
		userId,
		executor = db,
	) {
		await executor.execute(
			`
				DELETE FROM email_verification_tokens
				WHERE user_id = ?
					AND used_at IS NULL
			`,
			[userId],
		);
	}

	async function findValidEmailVerificationByTokenHash(
		tokenHash,
		executor = db,
	) {
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

	async function activateVerifiedUser(
		userId,
		executor = db,
	) {
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

	async function markEmailVerificationTokensUsed(
		userId,
		executor = db,
	) {
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

	async function findUserByEmail(email) {
		const [users] = await db.execute(
			`
				SELECT
					id,
					email,
					display_name,
					password_hash,
					status,
					email_verified_at
				FROM users
				WHERE email = ?
				LIMIT 1
			`,
			[email],
		);

		return users[0] ?? null;
	}

	async function updateLastLogin(userId) {
		await db.execute(
			`
				UPDATE users
				SET last_login_at = CURRENT_TIMESTAMP(3)
				WHERE id = ?
			`,
			[userId],
		);
	}

	return {
		withConnection,
		findExistingUserByEmail,
		findPendingUnverifiedUserByEmail,
		createPendingUser,
		assignSubscriberRole,
		createEmailVerificationToken,
		deleteUnusedEmailVerificationTokens,
		findValidEmailVerificationByTokenHash,
		activateVerifiedUser,
		markEmailVerificationTokensUsed,
		findUserByEmail,
		updateLastLogin,
	};
}