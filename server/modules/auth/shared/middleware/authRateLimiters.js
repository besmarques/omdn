import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

function getClientIp(req) {
	const ip = req.ip ?? req.socket?.remoteAddress;

	if (!ip) {
		return 'unknown-ip';
	}

	return ipKeyGenerator(ip);
}

function getNormalizedEmail(req) {
	const email = req.body?.email;

	if (typeof email !== 'string') {
		return 'missing-email';
	}

	return email.trim().toLowerCase() || 'missing-email';
}
function getAuthenticatedUserId(req) {
	const userId = Number(req.auth?.user?.id);

	if (!Number.isSafeInteger(userId) || userId <= 0) {
		return 'missing-user';
	}

	return String(userId);
}

function createLimiter({ createRateLimitStore, identifier, windowMs, limit, message, keyGenerator, skipSuccessfulRequests = false }) {
	return rateLimit({
		identifier,
		windowMs,
		limit,
		store: createRateLimitStore?.(identifier),
		passOnStoreError: false,

		standardHeaders: 'draft-8',
		legacyHeaders: false,

		keyGenerator,
		skipSuccessfulRequests,

		message: {
			status: false,
			message,
		},

		handler(req, res, next, options) {
			return res.status(options.statusCode).json(options.message);
		},
	});
}

export function createRegistrationRateLimiter(createRateLimitStore) {
	return createLimiter({
		createRateLimitStore,
		identifier: 'auth-registration',
		windowMs: 60 * 60 * 1000,
		limit: 3,

		message: 'Too many registration attempts. Please try again later.',

		keyGenerator(req) {
			return [getClientIp(req), getNormalizedEmail(req)].join(':');
		},
	});
}

export function createPasswordChangeRateLimiter(createRateLimitStore) {
	return createLimiter({
		createRateLimitStore,
		identifier: 'account-password-change',
		windowMs: 15 * 60 * 1000,
		limit: 5,
		skipSuccessfulRequests: true,

		message: 'Too many password change attempts. Please try again later.',

		keyGenerator(req) {
			return [getClientIp(req), getAuthenticatedUserId(req)].join(':');
		},
	});
}
export function createLoginRateLimiter(createRateLimitStore) {
	return createLimiter({
		createRateLimitStore,
		identifier: 'auth-login',
		windowMs: 15 * 60 * 1000,
		limit: 5,
		skipSuccessfulRequests: true,

		message: 'Too many login attempts. Please try again later.',

		keyGenerator(req) {
			return [getClientIp(req), getNormalizedEmail(req)].join(':');
		},
	});
}

export function createForgotPasswordRateLimiter(createRateLimitStore) {
	return createLimiter({
		createRateLimitStore,
		identifier: 'auth-password-forgot',
		windowMs: 60 * 60 * 1000,
		limit: 3,

		message: 'Too many password reset requests. Please try again later.',

		keyGenerator(req) {
			return [getClientIp(req), getNormalizedEmail(req)].join(':');
		},
	});
}

export function createEmailResendRateLimiter(createRateLimitStore) {
	return createLimiter({
		createRateLimitStore,
		identifier: 'auth-email-resend',
		windowMs: 60 * 60 * 1000,
		limit: 3,

		message: 'Too many verification email requests. Please try again later.',

		keyGenerator(req) {
			return [getClientIp(req), getNormalizedEmail(req)].join(':');
		},
	});
}

export function createTotpLoginRateLimiter(createRateLimitStore) {
	return createLimiter({
		createRateLimitStore,
		identifier: 'auth-totp-login',
		windowMs: 5 * 60 * 1000,
		limit: 5,
		skipSuccessfulRequests: true,

		message: 'Too many authentication attempts. Please try again later.',

		keyGenerator(req) {
			return [getClientIp(req), req.sessionID ?? 'missing-session'].join(':');
		},
	});
}
