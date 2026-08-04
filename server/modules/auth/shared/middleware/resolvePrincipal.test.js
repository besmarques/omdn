import { describe, expect, it, vi } from 'vitest';

import resolvePrincipal from '#server/modules/auth/shared/middleware/resolvePrincipal';

describe('resolvePrincipal', () => {
	it('continues with a guest when no session user exists', async () => {
		const db = { execute: vi.fn() };
		const next = vi.fn();
		const req = { session: {} };

		await resolvePrincipal(db)(req, {}, next);

		expect(next).toHaveBeenCalledOnce();
		expect(db.execute).not.toHaveBeenCalled();
		expect(req.auth).toBeUndefined();
	});

	it('loads an active principal for a private page request', async () => {
		const user = { id: 7, email: 'admin@example.com' };
		const db = {
			execute: vi
				.fn()
				.mockResolvedValueOnce([[user]])
				.mockResolvedValueOnce([[{ slug: 'administrator' }]])
				.mockResolvedValueOnce([[{ code: 'users.manage' }]]),
		};
		const next = vi.fn();
		const req = { session: { userId: 7 } };

		await resolvePrincipal(db)(req, {}, next);

		expect(req.auth).toEqual({
			user,
			roles: ['administrator'],
			permissions: ['users.manage'],
		});
		expect(next).toHaveBeenCalledOnce();
	});

	it('removes an invalid session and continues as a guest', async () => {
		const db = { execute: vi.fn().mockResolvedValueOnce([[]]) };
		const next = vi.fn();
		const destroy = vi.fn((callback) => callback());
		const req = { session: { userId: 7, destroy } };

		await resolvePrincipal(db)(req, {}, next);

		expect(destroy).toHaveBeenCalledOnce();
		expect(req.auth).toBeUndefined();
		expect(next).toHaveBeenCalledOnce();
	});
});
