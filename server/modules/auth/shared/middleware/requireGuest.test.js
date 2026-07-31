import { describe, expect, it, vi } from 'vitest';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

function createResponse() {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
	};
}

describe('requireGuest', () => {
	it('allows unauthenticated users', () => {
		const req = {
			session: {},
		};

		const res = createResponse();
		const next = vi.fn();

		requireGuest(req, res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});

	it('rejects authenticated users', () => {
		const req = {
			session: {
				userId: 1,
			},
		};

		const res = createResponse();
		const next = vi.fn();

		requireGuest(req, res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'You are already authenticated',
		});
	});
});
