import { describe, expect, it, vi } from 'vitest';

import createAuthEventOutboxRepository from '#server/modules/auth/shared/events/authEventOutboxRepository';

function createDatabase() {
	const connection = {
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		execute: vi.fn(),
		release: vi.fn(),
		rollback: vi.fn().mockResolvedValue(),
	};
	const db = {
		execute: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
		getConnection: vi.fn().mockResolvedValue(connection),
	};

	return { connection, db };
}

describe('authentication event outbox repository', () => {
	it('enqueues a normalized event payload', async () => {
		const { db } = createDatabase();
		const repository = createAuthEventOutboxRepository(db);

		await repository.create({
			userId: '42',
			eventType: 'login_succeeded',
			success: true,
		});

		expect(db.execute).toHaveBeenCalledWith('INSERT INTO auth_event_outbox (payload) VALUES (?)', [
			JSON.stringify({
				userId: 42,
				sessionId: null,
				eventType: 'login_succeeded',
				success: true,
				ipAddress: null,
				userAgent: null,
				metadata: null,
			}),
		]);
	});

	it('claims pending and stale work transactionally', async () => {
		const { connection, db } = createDatabase();
		const payload = { eventType: 'login_failed', success: false };

		connection.execute
			.mockResolvedValueOnce([[{ id: 7, payload: JSON.stringify(payload), attempts: 2 }]])
			.mockResolvedValueOnce([{ affectedRows: 1 }]);

		const repository = createAuthEventOutboxRepository(db);
		const item = await repository.claimNext('worker-1', 300_000);

		expect(item).toEqual({ id: 7, payload, attempts: 2 });
		expect(connection.execute).toHaveBeenNthCalledWith(1, expect.stringContaining('FOR UPDATE SKIP LOCKED'), [300_000_000]);
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('delivers and marks an item processed in one transaction', async () => {
		const { connection, db } = createDatabase();
		connection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

		const authEventRepository = {
			create: vi.fn().mockResolvedValue(),
		};
		const repository = createAuthEventOutboxRepository(db);
		const item = {
			id: 7,
			payload: { eventType: 'login_succeeded' },
		};

		await repository.complete(item, 'worker-1', authEventRepository);

		expect(authEventRepository.create).toHaveBeenCalledWith(item.payload, {
			executor: connection,
			outboxId: 7,
		});
		expect(connection.execute).toHaveBeenCalledWith(expect.stringContaining('processed_at = CURRENT_TIMESTAMP(3)'), [7, 'worker-1']);
		expect(connection.commit).toHaveBeenCalledOnce();
	});

	it('records retry state and releases the claim after failure', async () => {
		const { db } = createDatabase();
		const repository = createAuthEventOutboxRepository(db);

		await repository.fail({ id: 7 }, 'worker-1', new Error('delivery failed'), 2000);

		expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('attempts = attempts + 1'), [
			2_000_000,
			'delivery failed',
			7,
			'worker-1',
		]);
	});
});
