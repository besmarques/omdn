export default function requirePermission(permission) {
	return function requirePermissionMiddleware(req, res, next) {
		if (!req.auth) {
			return res.status(401).json({
				status: false,
				message: 'Authentication required',
			});
		}

		if (!req.auth.permissions.includes(permission)) {
			return res.status(403).json({
				status: false,
				message: 'You do not have permission to perform this action',
			});
		}

		return next();
	};
}