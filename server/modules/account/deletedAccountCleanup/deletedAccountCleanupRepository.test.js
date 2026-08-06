import { describe, expect, it, vi } from 'vitest';

import createDeletedAccountCleanupRepository from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupRepository';

function createDatabaseMock() {
	const connection = {
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		execute: vi.fn(),
		release: vi.fn(),
		rollback: vi.fn().mockResolvedValue(),
	};

	const db = {
		getConnection: vi.fn().mockResolvedValue(connection),
	};

	return {
		connection,
		db,
	};
}

describe('deleted-account cleanup repository', () => {
	it('reports no work when no deleted account has reached one year', async () => {
		const { connection, db } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([[]]);

		const repository = createDeletedAccountCleanupRepository(db);

		await expect(
			repository.purgeExpiredDeletedUsers(50),
		).resolves.toBe(0);

		expect(connection.execute).toHaveBeenCalledOnce();
		expect(connection.execute.mock.calls[0][0]).toContain(
			'INTERVAL 1 YEAR',
		);
		expect(connection.execute.mock.calls[0][1]).toEqual([50]);
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('removes all user-linked records and permanently deletes eligible users', async () => {
		const { connection, db } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([[{ id: 42 }, { id: 84 }]])
			.mockResolvedValueOnce([[]])
			.mockResolvedValueOnce([[]])
			.mockResolvedValueOnce([{ affectedRows: 0 }])
			.mockResolvedValueOnce([{ affectedRows: 2 }])
			.mockResolvedValueOnce([{ affectedRows: 1 }])
			.mockResolvedValueOnce([{ affectedRows: 6 }])
			.mockResolvedValueOnce([{ affectedRows: 2 }]);

		const repository = createDeletedAccountCleanupRepository(db);

		await expect(
			repository.purgeExpiredDeletedUsers(),
		).resolves.toBe(2);

		const statements = connection.execute.mock.calls.map(
			([sql]) => sql,
		);

		expect(statements[0]).toContain('FOR UPDATE SKIP LOCKED');
		expect(statements[1]).toContain('FROM posts');
		expect(statements[2]).toContain('FROM authors');
		expect(statements[3]).toContain('DELETE FROM authors');
		expect(statements[4]).toContain('DELETE FROM sessions');
		expect(statements[5]).toContain(
			'DELETE FROM auth_event_outbox',
		);
		expect(statements[6]).toContain('DELETE FROM auth_events');
		expect(statements[7]).toContain('DELETE FROM users');
		expect(statements[7]).toContain('INTERVAL 1 YEAR');

		for (const call of connection.execute.mock.calls.slice(1)) {
			expect(call[1]).toEqual([42, 84]);
		}

		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('rolls back the entire purge when a deletion fails', async () => {
		const { connection, db } = createDatabaseMock();
		const error = new Error('database unavailable');

		connection.execute
			.mockResolvedValueOnce([[{ id: 42 }]])
			.mockRejectedValueOnce(error);

		const repository = createDeletedAccountCleanupRepository(db);

		await expect(
			repository.purgeExpiredDeletedUsers(),
		).rejects.toThrow(error);

		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
