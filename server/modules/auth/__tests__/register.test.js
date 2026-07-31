import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';

vi.mock('argon2', () => ({
	default: {
		argon2id: 2,
		hash: vi.fn().mockResolvedValue('$argon2id$test-hash'),
	},
}));

import argon2 from 'argon2';

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

describe('POST /api/auth/register', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects invalid registration data', async () => {
		const { db } = createDatabaseMock();
		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/register').send({
			displayName: 'A',
			email: 'invalid-email',
			password: 'short',
		});

		expect(response.status).toBe(400);
		expect(response.body.status).toBe(false);
		expect(response.body.message).toBe('Invalid registration data');
		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('returns a generic response when the email already exists', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([
			[
				{
					id: 1,
				},
			],
		]);

		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/register').send({
			displayName: 'Test User',
			email: 'test@example.com',
			password: 'this is a long test password',
		});

		expect(response.status).toBe(202);
		expect(response.body).toEqual({
			status: true,
			message: 'If the email address can be registered, a verification email will be sent.',
		});

		expect(argon2.hash).not.toHaveBeenCalled();
		expect(connection.beginTransaction).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('creates a pending user with a subscriber role and verification token', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([[]])
			.mockResolvedValueOnce([
				{
					insertId: 42,
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

		const response = await request(app).post('/api/auth/register').send({
			displayName: 'Test User',
			email: 'TEST@EXAMPLE.COM',
			password: 'this is a long test password',
		});

		expect(response.status).toBe(201);
		expect(response.body.status).toBe(true);

		expect(argon2.hash).toHaveBeenCalledOnce();

		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();

		expect(connection.execute.mock.calls[1][1]).toEqual(['test@example.com', 'Test User', '$argon2id$test-hash']);

		expect(connection.execute.mock.calls[2][1]).toEqual([42]);

		expect(connection.execute.mock.calls[3][1]).toEqual([42, expect.any(Buffer)]);
	});
});
