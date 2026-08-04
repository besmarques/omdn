import { describe, expect, it, vi } from 'vitest';

import createWorkerLifecycle from '#server/application/createWorkerLifecycle';

describe('worker lifecycle', () => {
	it('starts and stops every application worker', async () => {
		const workers = [
			{ start: vi.fn(), stop: vi.fn().mockResolvedValue() },
			{ start: vi.fn(), stop: vi.fn().mockResolvedValue() },
		];
		const lifecycle = createWorkerLifecycle(workers);

		lifecycle.start();
		await lifecycle.stop();

		for (const worker of workers) {
			expect(worker.start).toHaveBeenCalledOnce();
			expect(worker.stop).toHaveBeenCalledOnce();
		}
	});
});
