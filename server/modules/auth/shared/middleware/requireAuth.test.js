import { describe, expect, it, vi } from 'vitest';

import requireAuth from '#server/modules/auth/shared/middleware/requireAuth';

function createResponse() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	};
}

describe('requireAuth', () => {
	it('rejects requests without a user session', async () => {
		const db = {
			execute: vi.fn(),
		};

		const req = {
			session: {},
		};

		const res = createResponse();
		const next = vi.fn();

		await requireAuth(db)(req, res, next);

		expect(db.execute).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'Authentication required',
		});
	});

	it('loads the authenticated user, roles and permissions', async () => {
		const user = {
			id: 1,
			email: 'test@example.com',
			display_name: 'Test User',
			status: 'active',
		};

		const db = {
			execute: vi
				.fn()
				.mockResolvedValueOnce([[user]])
				.mockResolvedValueOnce([
					[
						{
							slug: 'administrator',
						},
					],
				])
				.mockResolvedValueOnce([
					[
						{
							code: 'users.manage',
						},
						{
							code: 'posts.create',
						},
					],
				]),
		};

		const req = {
			session: {
				userId: 1,
			},
		};

		const res = createResponse();
		const next = vi.fn();

		await requireAuth(db)(req, res, next);

		expect(req.auth).toEqual({
			user,
			roles: ['administrator'],
			permissions: ['users.manage', 'posts.create'],
		});

		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('destroys the session when the user is unavailable', async () => {
		const db = {
			execute: vi.fn().mockResolvedValueOnce([[]]),
		};

		const destroy = vi.fn((callback) => callback());

		const req = {
			session: {
				userId: 1,
				destroy,
			},
		};

		const res = createResponse();
		const next = vi.fn();

		await requireAuth(db)(req, res, next);

		expect(destroy).toHaveBeenCalledOnce();
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'Authentication required',
		});
	});

	it('passes database errors to the error middleware', async () => {
		const error = new Error('Database unavailable');

		const db = {
			execute: vi.fn().mockRejectedValue(error),
		};

		const req = {
			session: {
				userId: 1,
			},
		};

		const res = createResponse();
		const next = vi.fn();

		await requireAuth(db)(req, res, next);

		expect(next).toHaveBeenCalledWith(error);
		expect(res.status).not.toHaveBeenCalled();
	});
});
