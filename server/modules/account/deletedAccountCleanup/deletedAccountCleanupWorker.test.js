import { describe, expect, it, vi } from 'vitest';

import createDeletedAccountCleanupWorker from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupWorker';

describe('deleted-account cleanup worker', () => {
	it('purges the configured batch size', async () => {
		const repository = {
			purgeExpiredDeletedUsers: vi.fn().mockResolvedValue(3),
		};
		const worker = createDeletedAccountCleanupWorker({
			batchSize: 25,
			repository,
		});

		await expect(worker.processNext()).resolves.toBe(3);
		expect(repository.purgeExpiredDeletedUsers).toHaveBeenCalledWith(25);
	});

	it('can be started and stopped without leaving its daily timer running', async () => {
		const repository = {
			purgeExpiredDeletedUsers: vi.fn().mockResolvedValue(0),
		};
		const worker = createDeletedAccountCleanupWorker({
			pollIntervalMs: 60_000,
			repository,
		});

		worker.start();

		await vi.waitFor(() => {
			expect(repository.purgeExpiredDeletedUsers).toHaveBeenCalledOnce();
		});

		await expect(worker.stop()).resolves.toBeUndefined();
	});
});
