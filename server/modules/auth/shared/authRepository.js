export default function createAuthRepository(db) {
	async function withConnection(callback) {
		const connection = await db.getConnection();

		try {
			return await callback(connection);
		} finally {
			connection.release();
		}
	}

	async function findExistingUserByEmail(email, executor = db) {
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

	async function createPendingUser({ email, displayName, passwordHash }, executor = db) {
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

	async function assignSubscriberRole(userId, executor = db) {
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
			FOR UPDATE
		`,
			[tokenHash],
		);

		return tokens[0] ?? null;
	}

	async function updateUserPassword(userId, passwordHash, executor = db) {
		await executor.execute(
			`
			UPDATE users
			SET
				password_hash = ?,
				password_changed_at = CURRENT_TIMESTAMP(3)
			WHERE id = ?
				AND status = 'active'
		`,
			[passwordHash, userId],
		);
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

	async function deleteUserSessions(userId, executor = db) {
		await executor.execute(
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
	}
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

	async function findActiveUserById(userId, executor = db) {
		const [users] = await executor.execute(
			`
			SELECT
				id,
				email,
				display_name,
				status,
				email_verified_at
			FROM users
			WHERE id = ?
				AND status = 'active'
				AND email_verified_at IS NOT NULL
				AND deleted_at IS NULL
			LIMIT 1
		`,
			[userId],
		);

		return users[0] ?? null;
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

	async function findActiveUserPasswordByIdForUpdate(userId, executor = db) {
		const [users] = await executor.execute(
			`
			SELECT
				id,
				password_hash
			FROM users
			WHERE id = ?
				AND status = 'active'
				AND email_verified_at IS NOT NULL
				AND deleted_at IS NULL
			LIMIT 1
			FOR UPDATE
		`,
			[userId],
		);

		return users[0] ?? null;
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

	async function deleteOtherUserSessions(userId, currentSessionId, executor = db) {
		const [result] = await executor.execute(
			`
			DELETE FROM sessions
			WHERE session_id <> ?
				AND JSON_VALID(data) = 1
				AND CAST(
					JSON_UNQUOTE(JSON_EXTRACT(data, '$.userId'))
					AS UNSIGNED
				) = ?
		`,
			[currentSessionId, userId],
		);

		return result.affectedRows;
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
		findPasswordResetUserByEmail,
		deleteUnusedPasswordResetTokens,
		createPasswordResetToken,
		findValidPasswordResetByTokenHash,
		updateUserPassword,
		markPasswordResetTokensUsed,
		deleteUserSessions,
		findTotpByUserId,
		findTotpByUserIdForUpdate,
		savePendingTotp,
		enableTotp,
		replaceRecoveryCodes,
		findActiveUserById,
		updateTotpLastUsedStep,
		findUnusedRecoveryCodeForUpdate,
		markRecoveryCodeUsed,
		findActiveUserPasswordByIdForUpdate,
		deleteRecoveryCodes,
		deleteTotp,
		deleteOtherUserSessions,
	};
}
