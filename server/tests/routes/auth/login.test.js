import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('argon2', () => ({
	default: {
		argon2id: 2,
		hash: vi.fn(),
		verify: vi.fn(),
	},
}));

import argon2 from 'argon2';

import createAuthRoutes from '#server/routes/authRoutes';

function createSession() {
	return {
		regenerate: vi.fn((callback) => callback()),
		save: vi.fn((callback) => callback()),
	};
}

function createTestApp(db, session = createSession()) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = session;
		next();
	});

	app.use('/api/auth', createAuthRoutes(db));

	return {
		app,
		session,
	};
}

describe('POST /api/auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects invalid login data', async () => {
		const db = {
			execute: vi.fn(),
		};

		const { app } = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				email: 'invalid-email',
				password: '',
			});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid login data',
		});

		expect(db.execute).not.toHaveBeenCalled();
	});

	it('returns a generic error when the user does not exist', async () => {
		const db = {
			execute: vi.fn().mockResolvedValueOnce([[]]),
		};

		const { app } = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				email: 'unknown@example.com',
				password: 'this is a long test password',
			});

		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid email or password',
		});

		expect(argon2.verify).not.toHaveBeenCalled();
	});

	it('returns the same generic error for an incorrect password', async () => {
		const db = {
			execute: vi.fn().mockResolvedValueOnce([
				[
					{
						id: 42,
						email: 'test@example.com',
						display_name: 'Test User',
						password_hash: '$argon2id$stored-hash',
						status: 'active',
						email_verified_at: new Date(),
					},
				],
			]),
		};

		argon2.verify.mockResolvedValueOnce(false);

		const { app } = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				email: 'test@example.com',
				password: 'incorrect password value',
			});

		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid email or password',
		});

		expect(argon2.verify).toHaveBeenCalledWith(
			'$argon2id$stored-hash',
			'incorrect password value',
		);
	});

	it('rejects a pending user with a valid password', async () => {
		const db = {
			execute: vi.fn().mockResolvedValueOnce([
				[
					{
						id: 42,
						email: 'test@example.com',
						display_name: 'Test User',
						password_hash: '$argon2id$stored-hash',
						status: 'pending',
						email_verified_at: null,
					},
				],
			]),
		};

		argon2.verify.mockResolvedValueOnce(true);

		const { app, session } = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				email: 'test@example.com',
				password: 'this is a long test password',
			});

		expect(response.status).toBe(403);
		expect(response.body).toEqual({
			status: false,
			message: 'Email verification required',
		});

		expect(session.regenerate).not.toHaveBeenCalled();
		expect(session.userId).toBeUndefined();
	});

	it('creates a session for an active user with a valid password', async () => {
		const db = {
			execute: vi
				.fn()
				.mockResolvedValueOnce([
					[
						{
							id: 42,
							email: 'test@example.com',
							display_name: 'Test User',
							password_hash: '$argon2id$stored-hash',
							status: 'active',
							email_verified_at: new Date(),
						},
					],
				])
				.mockResolvedValueOnce([
					{
						affectedRows: 1,
					},
				]),
		};

		argon2.verify.mockResolvedValueOnce(true);

		const { app, session } = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/login')
			.send({
				email: 'TEST@EXAMPLE.COM',
				password: 'this is a long test password',
			});

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			status: true,
			message: 'Login successful',
		});

		expect(session.regenerate).toHaveBeenCalledOnce();
		expect(session.userId).toBe(42);
		expect(session.save).toHaveBeenCalledOnce();

		expect(db.execute.mock.calls[0][1]).toEqual([
			'test@example.com',
		]);
	});
});