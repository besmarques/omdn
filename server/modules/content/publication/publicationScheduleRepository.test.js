import { describe, expect, it, vi } from 'vitest';

import createPublicationScheduleRepository from './publicationScheduleRepository';

describe('publication schedule repository', () => {
	it('emits article_published when publishing a scheduled article', async () => {
		const connection = {
			beginTransaction: vi.fn().mockResolvedValue(undefined),
			commit: vi.fn().mockResolvedValue(undefined),
			execute: vi
				.fn()
				.mockResolvedValueOnce([
					[
						{
							content_type: 'article',
							created_by_user_id: 7,
							id: 21,
							post_id: 12,
							publish_at: new Date('2026-08-06T18:00:00.000Z'),
							revision_id: 34,
						},
					],
				])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([{ affectedRows: 1 }])
				.mockResolvedValueOnce([{ insertId: 55 }])
				.mockResolvedValueOnce([{ affectedRows: 1 }]),
			release: vi.fn(),
			rollback: vi.fn().mockResolvedValue(undefined),
		};

		const database = {
			getConnection: vi.fn().mockResolvedValue(connection),
		};

		const repository = createPublicationScheduleRepository(database);

		await expect(repository.publishNextDue()).resolves.toBe(true);

		const outboxInsert = connection.execute.mock.calls.find(([sql]) =>
			sql.includes('INSERT INTO domain_outbox'),
		);

		const contentEventInsert = connection.execute.mock.calls.find(([sql]) =>
			sql.includes('INSERT INTO content_events'),
		);

		expect(outboxInsert).toBeDefined();
		expect(contentEventInsert).toBeDefined();

		expect(outboxInsert[1][1]).toBe('article_published');
		expect(contentEventInsert[1][4]).toBe('article_published');
	});
});
