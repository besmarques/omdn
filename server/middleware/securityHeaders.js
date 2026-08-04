export default function createSecurityHeaders({ production = false } = {}) {
	return function securityHeaders(_req, res, next) {
		res.set({
			'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
		});

		if (production) {
			res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
		}

		return next();
	};
}
