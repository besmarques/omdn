import { describe, expect, it, vi } from 'vitest';
import createPostLifecycleController from './postLifecycleController';

function response() {
	return { json: vi.fn(), status: vi.fn().mockReturnThis() };
}
function request(overrides = {}) {
	return {
		auth: { permissions: ['posts.publish_own'], user: { id: 7 } },
		body: { expectedLockVersion: 2 },
		params: { action: 'publish', contentType: 'recipe', id: '12' },
		...overrides,
	};
}

describe('post lifecycle controller', () => {
	it('publishes an owned post through the transactional repository', async () => {
		const editRepository = { findById: vi.fn().mockResolvedValue({ id: 12, owner_user_id: 7 }) };
		const lifecycleRepository = { transition: vi.fn().mockResolvedValue({ id: 12, lockVersion: 3, status: 'published' }) };
		const res = response();
		await createPostLifecycleController(editRepository, lifecycleRepository)(request(), res, vi.fn());
		expect(lifecycleRepository.transition).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'publish', actorId: 7, contentType: 'recipe', expectedLockVersion: 2, id: 12 }),
		);
		expect(res.json).toHaveBeenCalledWith({ status: true, data: { id: 12, lockVersion: 3, status: 'published' } });
	});

	it('prevents an own-scoped publisher from changing another owner post', async () => {
		const lifecycleRepository = { transition: vi.fn() };
		const res = response();
		await createPostLifecycleController({ findById: vi.fn().mockResolvedValue({ id: 12, owner_user_id: 9 }) }, lifecycleRepository)(
			request(),
			res,
			vi.fn(),
		);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(lifecycleRepository.transition).not.toHaveBeenCalled();
	});

	it('requires a future instant when scheduling', async () => {
		const res = response();
		await createPostLifecycleController({}, {}, () => new Date('2026-08-05T12:00:00.000Z'))(
			request({
				body: { expectedLockVersion: 2, publishAt: '2026-08-05T11:00:00.000Z' },
				params: { action: 'schedule', contentType: 'recipe', id: '12' },
			}),
			res,
			vi.fn(),
		);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it('returns a conflict for stale saves and illegal transitions', async () => {
		const res = response();
		const error = Object.assign(new Error('Reload before trying again.'), { code: 'EDIT_CONFLICT' });
		await createPostLifecycleController(
			{ findById: vi.fn().mockResolvedValue({ id: 12, owner_user_id: 7 }) },
			{ transition: vi.fn().mockRejectedValue(error) },
		)(request(), res, vi.fn());
		expect(res.status).toHaveBeenCalledWith(409);
		expect(res.json).toHaveBeenCalledWith({ status: false, message: 'Reload before trying again.' });
	});
});
