import { describe, expect, it, vi } from 'vitest';

import createAuthEventOutboxWorker from '#server/modules/auth/shared/events/authEventOutboxWorker';

function createWorker(outboxRepository) {
	return createAuthEventOutboxWorker({
		authEventRepository: { create: vi.fn() },
		outboxRepository,
		workerId: 'worker-1',
	});
}

describe('authentication event outbox worker', () => {
	it('delivers a claimed event', async () => {
		const item = { id: 7, attempts: 0, payload: { eventType: 'login_succeeded' } };
		const outboxRepository = {
			claimNext: vi.fn().mockResolvedValue(item),
			complete: vi.fn().mockResolvedValue(),
			fail: vi.fn(),
		};
		const worker = createWorker(outboxRepository);

		await expect(worker.processNext()).resolves.toBe(true);
		expect(outboxRepository.claimNext).toHaveBeenCalledWith('worker-1', 300_000);
		expect(outboxRepository.complete).toHaveBeenCalledWith(item, 'worker-1', expect.any(Object));
		expect(outboxRepository.fail).not.toHaveBeenCalled();
	});

	it('schedules exponential retry after delivery failure', async () => {
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		const item = { id: 7, attempts: 2, payload: { eventType: 'login_failed' } };
		const deliveryError = new Error('database unavailable');
		const outboxRepository = {
			claimNext: vi.fn().mockResolvedValue(item),
			complete: vi.fn().mockRejectedValue(deliveryError),
			fail: vi.fn().mockResolvedValue(),
		};
		const worker = createWorker(outboxRepository);

		await expect(worker.processNext()).resolves.toBe(true);
		expect(outboxRepository.fail).toHaveBeenCalledWith(item, 'worker-1', deliveryError, 4000);
		expect(errorLog).toHaveBeenCalledWith(
			'Unable to deliver authentication event from outbox',
			expect.objectContaining({
				attempts: 3,
				outboxId: 7,
				retryDelayMs: 4000,
			}),
		);
		errorLog.mockRestore();
	});

	it('reports no work when no event can be claimed', async () => {
		const outboxRepository = {
			claimNext: vi.fn().mockResolvedValue(null),
		};
		const worker = createWorker(outboxRepository);

		await expect(worker.processNext()).resolves.toBe(false);
	});
});
