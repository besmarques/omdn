export default function resolvePrincipal(db) {
	return async function resolvePrincipalMiddleware(req, _res, next) {
		const userId = req.session?.userId;

		if (!userId) {
			return next();
		}

		try {
			const [users] = await db.execute(
				`
					SELECT
						id,
						email,
						display_name,
						status,
						email_verified_at,
						last_login_at,
						created_at
					FROM users
					WHERE id = ?
						AND status = 'active'
					LIMIT 1
				`,
				[userId],
			);

			const user = users[0];

			if (!user) {
				return req.session.destroy(next);
			}

			const [roles] = await db.execute(
				`
					SELECT roles.slug
					FROM user_roles
					INNER JOIN roles
						ON roles.id = user_roles.role_id
					WHERE user_roles.user_id = ?
				`,
				[userId],
			);

			const [permissions] = await db.execute(
				`
					SELECT DISTINCT permissions.code
					FROM user_roles
					INNER JOIN role_permissions
						ON role_permissions.role_id = user_roles.role_id
					INNER JOIN permissions
						ON permissions.id = role_permissions.permission_id
					WHERE user_roles.user_id = ?
				`,
				[userId],
			);

			req.auth = {
				user,
				roles: roles.map((role) => role.slug),
				permissions: permissions.map((permission) => permission.code),
			};

			return next();
		} catch (error) {
			return next(error);
		}
	};
}
