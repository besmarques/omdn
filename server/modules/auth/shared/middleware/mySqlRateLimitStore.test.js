import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import createMySqlRateLimitStore from '#server/modules/auth/shared/middleware/mySqlRateLimitStore';

function createDatabase() {
	const connection = {
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		execute: vi.fn(),
		release: vi.fn(),
		rollback: vi.fn().mockResolvedValue(),
	};

	return {
		connection,
		db: {
			execute: vi.fn().mockResolvedValue(),
			getConnection: vi.fn().mockResolvedValue(connection),
		},
	};
}

describe('MySQL rate-limit store', () => {
	it('increments a namespaced, hashed counter in a transaction', async () => {
		const { connection, db } = createDatabase();
		const resetAt = new Date('2026-08-01T12:15:00.000Z');

		connection.execute
			.mockResolvedValueOnce([{ affectedRows: 0 }])
			.mockResolvedValueOnce([{ affectedRows: 1 }])
			.mockResolvedValueOnce([[{ hits: 2, reset_at: resetAt }]]);

		const store = createMySqlRateLimitStore(db, 'auth-login');
		store.init({ windowMs: 15 * 60 * 1000 });

		const result = await store.increment('127.0.0.1:test@example.com');
		const expectedHash = createHash('sha256').update('127.0.0.1:test@example.com').digest();

		expect(result).toEqual({
			totalHits: 2,
			resetTime: resetAt,
		});
		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.execute).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO rate_limit_counters'), [
			'auth-login',
			expectedHash,
			900_000_000,
		]);
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('rolls back, releases the connection, and propagates store errors', async () => {
		const { connection, db } = createDatabase();
		const databaseError = new Error('database unavailable');

		connection.execute.mockRejectedValueOnce(databaseError);

		const store = createMySqlRateLimitStore(db, 'auth-login');
		store.init({ windowMs: 1000 });

		await expect(store.increment('client')).rejects.toBe(databaseError);
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('decrements successful requests and resets keys by namespace and hash', async () => {
		const { db } = createDatabase();
		const store = createMySqlRateLimitStore(db, 'auth-login');
		const expectedHash = createHash('sha256').update('client').digest();

		await store.decrement('client');
		await store.resetKey('client');

		expect(db.execute).toHaveBeenNthCalledWith(1, expect.stringContaining('SET hits = GREATEST(hits - 1, 0)'), [
			'auth-login',
			expectedHash,
		]);
		expect(db.execute).toHaveBeenNthCalledWith(2, 'DELETE FROM rate_limit_counters WHERE namespace = ? AND key_hash = ?', [
			'auth-login',
			expectedHash,
		]);
	});
});
