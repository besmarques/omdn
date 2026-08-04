import resolvePrincipal from '#server/modules/auth/shared/middleware/resolvePrincipal';

export default function requireAuth(db) {
	const resolve = resolvePrincipal(db);

	return function requireAuthMiddleware(req, res, next) {
		return resolve(req, res, (error) => {
			if (error) {
				return next(error);
			}

			if (!req.auth) {
				return res.status(401).json({
					status: false,
					message: 'Authentication required',
				});
			}

			return next();
		});
	};
}
