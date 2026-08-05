import { describe, expect, it, vi } from 'vitest';

import createPublicationScheduleWorker from './publicationScheduleWorker';

describe('publication schedule worker', () => {
	it('publishes the next due schedule through its repository', async () => {
		const repository = { publishNextDue: vi.fn().mockResolvedValue(true) };
		const worker = createPublicationScheduleWorker({ repository });

		await expect(worker.processNext()).resolves.toBe(true);
		expect(repository.publishNextDue).toHaveBeenCalledOnce();
	});
});
