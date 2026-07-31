import { Buffer } from 'node:buffer';

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import createAuthRoutes from '#server/modules/auth/authRoutes';

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

describe('POST /api/auth/email/resend', () => {
	it('returns a generic response when no email is supplied', async () => {
		const { db } = createDatabaseMock();
		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/email/resend').send({});

		expect(response.status).toBe(200);
		expect(response.body.status).toBe(true);
		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('returns a generic response when no pending user exists', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([[]]);

		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/email/resend').send({
			email: 'unknown@example.com',
		});

		expect(response.status).toBe(200);
		expect(response.body.status).toBe(true);

		expect(connection.beginTransaction).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('replaces existing tokens with a new verification token', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
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

		const response = await request(app).post('/api/auth/email/resend').send({
			email: 'TEST@EXAMPLE.COM',
		});

		expect(response.status).toBe(200);
		expect(response.body.status).toBe(true);

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();

		expect(connection.execute.mock.calls[0][1]).toEqual(['test@example.com']);

		expect(connection.execute.mock.calls[1][1]).toEqual([42]);

		expect(connection.execute.mock.calls[2][1]).toEqual([42, expect.any(Buffer)]);
	});
});
