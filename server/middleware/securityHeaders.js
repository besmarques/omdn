import { randomBytes } from 'node:crypto';

export default function createSecurityHeaders({ production = false } = {}) {
	return function securityHeaders(req, res, next) {
		const cspNonce = randomBytes(16).toString('base64');

		res.locals.cspNonce = cspNonce;
		req.headers['x-omdn-csp-nonce'] = cspNonce;
		res.set({
			'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
		});

		if (production) {
			res.set(
				'Content-Security-Policy',
				`default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'nonce-${cspNonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'`,
			);
			res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
		}

		return next();
	};
}
