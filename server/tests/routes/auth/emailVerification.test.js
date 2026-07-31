import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';

import createAuthRoutes from '#server/routes/authRoutes';

function createTestApp(db) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = {};
		next();
	});

	app.use('/api/auth', createAuthRoutes(db));

	return app;
}

function createDatabaseMock() {
	const connection = {
		execute: vi.fn(),
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		rollback: vi.fn().mockResolvedValue(),
		release: vi.fn(),
	};

	const db = {
		getConnection: vi.fn().mockResolvedValue(connection),
	};

	return {
		db,
		connection,
	};
}

describe('POST /api/auth/email/verify', () => {
	it('rejects an invalid token format', async () => {
		const { db } = createDatabaseMock();
		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/email/verify')
			.send({
				token: 'invalid-token',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid or expired verification token',
		});

		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('rejects an unknown or expired token', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([[]]);

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/email/verify')
			.send({
				token: 'a'.repeat(64),
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid or expired verification token',
		});

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('activates the user and consumes the verification token', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 10,
						user_id: 42,
						status: 'pending',
					},
				],
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 1,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 1,
				},
			]);

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/email/verify')
			.send({
				token: 'b'.repeat(64),
			});

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			status: true,
			message: 'Email verified successfully',
		});

		expect(connection.execute.mock.calls[0][1]).toEqual([
			expect.any(Buffer),
		]);

		expect(connection.execute.mock.calls[1][1]).toEqual([42]);
		expect(connection.execute.mock.calls[2][1]).toEqual([42]);

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});
});