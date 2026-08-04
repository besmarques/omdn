export const sessionIdleTimeout = 6 * 60 * 60 * 1000;
export const defaultSessionAbsoluteLifetime = 24 * 60 * 60 * 1000;
export const rememberedSessionAbsoluteLifetime = 30 * 24 * 60 * 60 * 1000;

export function establishAuthenticatedSession(session, { rememberMe = false, now = Date.now() } = {}) {
	const absoluteLifetime = rememberMe ? rememberedSessionAbsoluteLifetime : defaultSessionAbsoluteLifetime;

	session.authenticatedAt = now;
	session.lastActivityAt = now;
	session.absoluteExpiresAt = now + absoluteLifetime;
	session.rememberMe = rememberMe;
	session.cookie.maxAge = Math.min(sessionIdleTimeout, absoluteLifetime);
}

export function evaluateAuthenticatedSession(session, now = Date.now()) {
	if (!session?.userId) {
		return { authenticated: false, expired: false };
	}

	const lastActivityAt = Number(session.lastActivityAt);
	const absoluteExpiresAt = Number(session.absoluteExpiresAt);

	if (!Number.isFinite(lastActivityAt) || !Number.isFinite(absoluteExpiresAt)) {
		return { authenticated: true, expired: true };
	}

	if (now - lastActivityAt >= sessionIdleTimeout || now >= absoluteExpiresAt) {
		return { authenticated: true, expired: true };
	}

	return {
		authenticated: true,
		expired: false,
		maxAge: Math.min(sessionIdleTimeout, absoluteExpiresAt - now),
	};
}
