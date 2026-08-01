import { Buffer } from 'node:buffer';

import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import createAuthModule from '#server/modules/auth/authModule';

function createTestApp(db) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = {};
		next();
	});

	app.use('/api/auth', createAuthModule(db));

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

describe('POST /api/auth/password/forgot', () => {
	it('returns a generic response for an invalid email', async () => {
		const { db } = createDatabaseMock();
		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/password/forgot').send({
			email: 'invalid-email',
		});

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'If the account exists, a password reset email will be sent.',
		});

		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('returns a generic response when the user does not exist', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([[]]);

		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/password/forgot').send({
			email: 'unknown@example.com',
		});

		expect(response.status).toBe(200);

		expect(connection.beginTransaction).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('replaces old tokens and creates a new reset token', async () => {
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

		const response = await request(app).post('/api/auth/password/forgot').send({
			email: 'TEST@EXAMPLE.COM',
		});

		expect(response.status).toBe(200);

		expect(connection.execute.mock.calls[0][1]).toEqual(['test@example.com']);

		expect(connection.execute.mock.calls[1][1]).toEqual([42]);

		expect(connection.execute.mock.calls[2][1]).toEqual([42, expect.any(Buffer)]);

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});
});

describe('POST /api/auth/password/reset', () => {
	it('rejects invalid reset data', async () => {
		const { db } = createDatabaseMock();
		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/password/reset').send({
			token: 'invalid',
			password: 'short',
		});

		expect(response.status).toBe(400);
		expect(response.body.status).toBe(false);
		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('rejects an unknown or expired token', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([[]]);

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/password/reset')
			.send({
				token: 'a'.repeat(64),
				password: 'a-secure-password-with-15-characters',
			});

		expect(response.status).toBe(400);

		expect(response.body).toEqual({
			status: false,
			message: 'Invalid or expired password reset token',
		});

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('updates the password and consumes reset tokens', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 10,
						user_id: 42,
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
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 1,
				},
			]);

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/password/reset')
			.send({
				token: 'b'.repeat(64),
				password: 'a-new-secure-password-with-15-characters',
			});

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'Password reset successfully',
		});

		expect(connection.execute.mock.calls[0][1]).toEqual([expect.any(Buffer)]);

		expect(connection.execute.mock.calls[1][1]).toEqual([expect.any(String), 42]);

		expect(connection.execute.mock.calls[2][1]).toEqual([42]);

		expect(String(connection.execute.mock.calls[3][0])).toContain('JSON_EXTRACT');
		expect(String(connection.execute.mock.calls[3][0])).not.toContain('user_id');

		expect(connection.execute.mock.calls[3][1]).toEqual([42]);

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
