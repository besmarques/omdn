export default function createCredentialsRepository(db) {
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

	async function updateLastLogin(userId, executor = db) {
		await executor.execute(
			`
				UPDATE users
				SET last_login_at = CURRENT_TIMESTAMP(3)
				WHERE id = ?
			`,
			[userId],
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

	return {
		findUserByEmail,
		updateLastLogin,
		findActiveUserById,
		findActiveUserPasswordByIdForUpdate,
		updateUserPassword,
	};
}
