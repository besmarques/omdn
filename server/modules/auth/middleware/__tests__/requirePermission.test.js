import { describe, expect, it, vi } from 'vitest';

import requirePermission from '#server/modules/auth/middleware/requirePermission';

function createResponse() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	};
}

describe('requirePermission', () => {
	it('rejects requests without authentication data', () => {
		const req = {};
		const res = createResponse();
		const next = vi.fn();

		requirePermission('users.manage')(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'Authentication required',
		});
	});

	it('rejects users without the required permission', () => {
		const req = {
			auth: {
				permissions: ['posts.create'],
			},
		};

		const res = createResponse();
		const next = vi.fn();

		requirePermission('users.manage')(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'You do not have permission to perform this action',
		});
	});

	it('allows users with the required permission', () => {
		const req = {
			auth: {
				permissions: ['posts.create', 'users.manage'],
			},
		};

		const res = createResponse();
		const next = vi.fn();

		requirePermission('users.manage')(req, res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});
});
