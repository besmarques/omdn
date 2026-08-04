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

import createAuthModule from '#server/modules/auth/authModule';

function createSession() {
	return {
		cookie: {},
		regenerate: vi.fn((callback) => callback()),
		save: vi.fn((callback) => callback()),
	};
}

function createTestApp(db, session = createSession(), sessionId = 'current-session') {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = session;
		req.sessionID = sessionId;

		next();
	});

	app.use('/api/auth', createAuthModule(db));

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

		const response = await request(app).post('/api/auth/login').send({
			email: 'invalid-email',
			password: '',
		});

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid login data',
		});

		expect(db.execute).toHaveBeenCalledOnce();

		expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO auth_events'), [
			null,
			'current-session',
			'login_failed',
			0,
			'127.0.0.1',
			null,
			JSON.stringify({
				statusCode: 400,
				rateLimited: false,
			}),
		]);
	});

	it('returns a generic error when the user does not exist', async () => {
		const db = {
			execute: vi.fn().mockResolvedValueOnce([[]]),
		};

		const { app } = createTestApp(db);

		const response = await request(app).post('/api/auth/login').send({
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
				.mockResolvedValueOnce([[]])
				.mockResolvedValueOnce([
					{
						affectedRows: 1,
					},
				]),
		};

		argon2.verify.mockResolvedValueOnce(false);

		const { app } = createTestApp(db);

		const response = await request(app).post('/api/auth/login').send({
			email: 'test@example.com',
			password: 'incorrect password value',
		});

		expect(response.status).toBe(401);
		expect(response.body).toEqual({
			status: false,
			message: 'Invalid email or password',
		});

		expect(argon2.verify).toHaveBeenCalledWith('$argon2id$stored-hash', 'incorrect password value');
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

		const response = await request(app).post('/api/auth/login').send({
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

	it('creates a default 24-hour session without removing other devices', async () => {
		const connection = {
			execute: vi.fn().mockResolvedValueOnce([
				{
					affectedRows: 1,
				},
			]),
			beginTransaction: vi.fn().mockResolvedValue(),
			commit: vi.fn().mockResolvedValue(),
			rollback: vi.fn().mockResolvedValue(),
			release: vi.fn(),
		};
		const db = {
			execute: vi
				.fn()
				.mockResolvedValue([
					{
						affectedRows: 1,
					},
				])
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
				.mockResolvedValueOnce([[]]),
			getConnection: vi.fn().mockResolvedValue(connection),
		};

		argon2.verify.mockResolvedValueOnce(true);

		const { app, session } = createTestApp(db, createSession(), 'new-session-id');

		const response = await request(app).post('/api/auth/login').send({
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
		expect(db.execute.mock.calls[0][1]).toEqual(['test@example.com']);
		expect(connection.execute.mock.calls[0][1]).toEqual([42]);
		expect(String(connection.execute.mock.calls[0][0])).not.toContain('DELETE FROM sessions');
		expect(session.rememberMe).toBe(false);
		expect(session.absoluteExpiresAt - session.authenticatedAt).toBe(24 * 60 * 60 * 1000);
		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it('does not persist authentication when login finalization fails', async () => {
		const finalizationError = new Error('Unable to update last login');
		const connection = {
			execute: vi.fn().mockRejectedValueOnce(finalizationError),
			beginTransaction: vi.fn().mockResolvedValue(),
			commit: vi.fn().mockResolvedValue(),
			rollback: vi.fn().mockResolvedValue(),
			release: vi.fn(),
		};
		const db = {
			execute: vi
				.fn()
				.mockResolvedValue([{ affectedRows: 1 }])
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
				.mockResolvedValueOnce([[]]),
			getConnection: vi.fn().mockResolvedValue(connection),
		};
		argon2.verify.mockResolvedValueOnce(true);
		const { app, session } = createTestApp(db, createSession(), 'failed-session-id');

		const response = await request(app).post('/api/auth/login').send({
			email: 'test@example.com',
			password: 'this is a long test password',
		});

		expect(response.status).toBe(500);
		expect(session.regenerate).toHaveBeenCalledOnce();
		expect(session.userId).toBeUndefined();
		expect(session.save).not.toHaveBeenCalled();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledOnce();
	});
	it('does not remove old sessions before TOTP succeeds', async () => {
		const db = {
			execute: vi
				.fn()
				.mockResolvedValue([
					{
						affectedRows: 1,
					},
				])
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
					[
						{
							user_id: 42,
							is_enabled: 1,
						},
					],
				]),
		};

		argon2.verify.mockResolvedValueOnce(true);

		const { app, session } = createTestApp(db, createSession(), 'pending-session-id');

		const response = await request(app).post('/api/auth/login').send({
			email: 'test@example.com',
			password: 'this is a long test password',
			rememberMe: true,
		});

		expect(response.status).toBe(202);

		expect(session.pendingTwoFactorUserId).toBe(42);
		expect(session.pendingTwoFactorRememberMe).toBe(true);

		const sessionDeletes = db.execute.mock.calls.filter(([sql]) => String(sql).includes('DELETE FROM sessions'));

		expect(sessionDeletes).toHaveLength(0);
	});
});
