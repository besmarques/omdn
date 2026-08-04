import { describe, expect, it } from 'vitest';

import {
	defaultSessionAbsoluteLifetime,
	establishAuthenticatedSession,
	evaluateAuthenticatedSession,
	rememberedSessionAbsoluteLifetime,
	sessionIdleTimeout,
} from '#server/modules/auth/shared/sessionPolicy';

function createSession() {
	return { cookie: {} };
}

describe('authenticated session policy', () => {
	it('creates a default session with a 24-hour absolute deadline', () => {
		const session = createSession();

		establishAuthenticatedSession(session, { now: 1_000 });

		expect(session).toMatchObject({
			authenticatedAt: 1_000,
			lastActivityAt: 1_000,
			absoluteExpiresAt: 1_000 + defaultSessionAbsoluteLifetime,
			rememberMe: false,
		});
		expect(session.cookie.maxAge).toBe(sessionIdleTimeout);
	});

	it('creates a remembered session with a 30-day absolute deadline', () => {
		const session = createSession();

		establishAuthenticatedSession(session, { rememberMe: true, now: 1_000 });

		expect(session.absoluteExpiresAt).toBe(1_000 + rememberedSessionAbsoluteLifetime);
		expect(session.rememberMe).toBe(true);
		expect(session.cookie.maxAge).toBe(sessionIdleTimeout);
	});

	it('expires at six hours of inactivity or at the absolute deadline', () => {
		const session = { userId: 1, lastActivityAt: 1_000, absoluteExpiresAt: 1_000 + defaultSessionAbsoluteLifetime };

		expect(evaluateAuthenticatedSession(session, 1_000 + sessionIdleTimeout - 1).expired).toBe(false);
		expect(evaluateAuthenticatedSession(session, 1_000 + sessionIdleTimeout).expired).toBe(true);
		expect(evaluateAuthenticatedSession({ ...session, lastActivityAt: 10_000 }, session.absoluteExpiresAt).expired).toBe(true);
	});

	it('rejects legacy authenticated sessions without policy metadata', () => {
		expect(evaluateAuthenticatedSession({ userId: 1 })).toEqual({ authenticated: true, expired: true });
	});
});
