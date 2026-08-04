import { randomBytes, timingSafeEqual } from 'node:crypto';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function createToken() {
	return randomBytes(32).toString('base64url');
}

function tokensMatch(actualToken, expectedToken) {
	if (!tokenPattern.test(actualToken ?? '') || !tokenPattern.test(expectedToken ?? '')) {
		return false;
	}

	return timingSafeEqual(Buffer.from(actualToken), Buffer.from(expectedToken));
}

function requestSourceIsTrusted(req) {
	const fetchSite = req.get('sec-fetch-site');

	if (fetchSite === 'cross-site') {
		return false;
	}

	// Browsers calculate this header before a development/reverse proxy rewrites
	// the request host, so it remains accurate when Origin and Host use different
	// internal ports. Sec-Fetch-Site is a forbidden request header in browsers.
	if (fetchSite === 'same-origin') {
		return true;
	}

	const source = req.get('origin') ?? req.get('referer');

	if (!source) {
		return true;
	}

	const host = req.get('host');

	if (!host) {
		return false;
	}

	try {
		const expectedOrigin = new URL(`${req.protocol}://${host}`).origin;

		return new URL(source).origin === expectedOrigin;
	} catch {
		return false;
	}
}

function forbiddenResponse(res) {
	return res.status(403).json({
		status: false,
		code: 'CSRF_TOKEN_INVALID',
		message: 'Invalid or missing CSRF token',
	});
}

export function issueCsrfToken(req, res, next) {
	if (!req.session) {
		return next(new Error('Session middleware is required before CSRF token issuance'));
	}

	if (!tokenPattern.test(req.session.csrfToken ?? '')) {
		req.session.csrfToken = createToken();
	}

	res.set('Cache-Control', 'private, no-store');

	return res.json({
		status: true,
		data: {
			csrfToken: req.session.csrfToken,
		},
	});
}

export function requireCsrfProtection(req, res, next) {
	if (safeMethods.has(req.method)) {
		return next();
	}

	if (!requestSourceIsTrusted(req)) {
		return forbiddenResponse(res);
	}

	const suppliedToken = req.get('x-csrf-token');
	const expectedToken = req.session?.csrfToken;

	if (!tokensMatch(suppliedToken, expectedToken)) {
		return forbiddenResponse(res);
	}

	return next();
}
