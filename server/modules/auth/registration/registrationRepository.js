export default function createRegistrationRepository(db) {
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

	return {
		findExistingUserByEmail,
		createPendingUser,
		assignSubscriberRole,
	};
}
