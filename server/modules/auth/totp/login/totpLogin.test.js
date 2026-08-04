import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('otplib', () => ({
	generateSecret: vi.fn(),
	generateURI: vi.fn(),
	verify: vi.fn(),
}));

vi.mock('#server/modules/auth/totp/shared/totpEncryption', () => ({
	encryptTotpSecret: vi.fn(),
	decryptTotpSecret: vi.fn(() => 'BASE32SECRET'),
}));

import { verify } from 'otplib';

import createAuthModule from '#server/modules/auth/authModule';

function createSession(values = {}) {
	return {
		cookie: {},
		regenerate: vi.fn((callback) => callback()),

		save: vi.fn((callback) => callback()),

		...values,
	};
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
		execute: vi.fn().mockResolvedValue([
			{
				affectedRows: 1,
			},
		]),

		getConnection: vi.fn().mockResolvedValue(connection),
	};

	return {
		db,
		connection,
	};
}

function createTestApp(db, session, sessionId = 'current-session') {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = session;
		req.sessionID = sessionId;

		next();
	});

	app.use('/api/auth', createAuthModule(db));

	return app;
}

function findDatabaseCall(executor, text) {
	return executor.execute.mock.calls.find(([sql]) => String(sql).includes(text));
}

describe('POST /api/auth/totp/login/verify', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects a request without a pending challenge', async () => {
		const { db } = createDatabaseMock();

		const session = createSession();

		const app = createTestApp(db, session, 'pending-session');

		const response = await request(app).post('/api/auth/totp/login/verify').send({
			code: '123456',
		});

		expect(response.status).toBe(401);
		expect(response.body.status).toBe(false);

		expect(db.getConnection).not.toHaveBeenCalled();

		const deleteSessionCall = findDatabaseCall(db, 'DELETE FROM sessions');

		expect(deleteSessionCall).toBeUndefined();
	});

	it('authenticates a valid TOTP code without removing other devices', async () => {
		const { db, connection } = createDatabaseMock();

		const session = createSession({
			pendingTwoFactorUserId: 42,

			pendingTwoFactorExpiresAt: Date.now() + 300000,

			pendingTwoFactorAttempts: 0,

			pendingTwoFactorRememberMe: true,
		});

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						user_id: 42,

						secret_encrypted: 'encrypted',

						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						is_enabled: 1,

						last_used_step: 100,
					},
				],
			])
			.mockResolvedValueOnce([
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

						status: 'active',

						email_verified_at: new Date(),
					},
				],
			])
			.mockResolvedValueOnce([{ affectedRows: 1 }]);

		verify.mockResolvedValueOnce({
			valid: true,
			timeStep: 101,
			epoch: 3030,
			delta: 0,
		});

		const app = createTestApp(db, session, 'new-totp-session');

		const response = await request(app).post('/api/auth/totp/login/verify').send({
			code: '123456',
		});

		expect(response.status).toBe(200);

		expect(response.body).toMatchObject({
			status: true,
			message: 'Login successful',
			data: {
				authenticationState: 'authenticated',
			},
		});

		expect(verify).toHaveBeenCalledWith(
			expect.objectContaining({
				secret: 'BASE32SECRET',

				token: '123456',

				afterTimeStep: 100,
			}),
		);

		expect(connection.execute.mock.calls[1][1]).toEqual([101, 42, 101]);

		expect(connection.commit).toHaveBeenCalledTimes(2);

		expect(session.regenerate).toHaveBeenCalledOnce();

		expect(session.userId).toBe(42);

		expect(session.save).toHaveBeenCalledOnce();
		expect(session.rememberMe).toBe(true);
		expect(session.absoluteExpiresAt - session.authenticatedAt).toBe(30 * 24 * 60 * 60 * 1000);

		const deleteSessionCall = findDatabaseCall(connection, 'DELETE FROM sessions');

		expect(deleteSessionCall).toBeUndefined();

		const updateLastLoginCall = findDatabaseCall(connection, 'last_login_at');

		expect(updateLastLoginCall).toBeDefined();

		expect(updateLastLoginCall[1]).toEqual([42]);
	});

	it('does not persist authentication when TOTP login finalization fails', async () => {
		const { db, connection } = createDatabaseMock();
		const session = createSession({
			pendingTwoFactorUserId: 42,
			pendingTwoFactorExpiresAt: Date.now() + 300000,
			pendingTwoFactorAttempts: 0,
		});
		connection.execute
			.mockResolvedValueOnce([
				[
					{
						user_id: 42,
						secret_encrypted: 'encrypted',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						is_enabled: 1,
						last_used_step: 100,
					},
				],
			])
			.mockResolvedValueOnce([{ affectedRows: 1 }])
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						email: 'test@example.com',
						display_name: 'Test User',
						status: 'active',
						email_verified_at: new Date(),
					},
				],
			])
			.mockRejectedValueOnce(new Error('Unable to update last login'));
		verify.mockResolvedValueOnce({
			valid: true,
			timeStep: 101,
			epoch: 3030,
			delta: 0,
		});
		const app = createTestApp(db, session, 'failed-totp-session');

		const response = await request(app).post('/api/auth/totp/login/verify').send({ code: '123456' });

		expect(response.status).toBe(500);
		expect(session.regenerate).toHaveBeenCalledOnce();
		expect(session.userId).toBeUndefined();
		expect(session.save).not.toHaveBeenCalled();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledTimes(2);
	});
	it('rejects a reused or invalid TOTP code without removing sessions', async () => {
		const { db, connection } = createDatabaseMock();

		const session = createSession({
			pendingTwoFactorUserId: 42,

			pendingTwoFactorExpiresAt: Date.now() + 300000,

			pendingTwoFactorAttempts: 0,
		});

		connection.execute.mockResolvedValueOnce([
			[
				{
					user_id: 42,

					secret_encrypted: 'encrypted',

					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					is_enabled: 1,

					last_used_step: 100,
				},
			],
		]);

		verify.mockResolvedValueOnce({
			valid: false,
		});

		const app = createTestApp(db, session, 'new-totp-session');

		const response = await request(app).post('/api/auth/totp/login/verify').send({
			code: '123456',
		});

		expect(response.status).toBe(401);
		expect(response.body.data).toMatchObject({
			authenticationState: 'totp_required',
			remainingAttempts: 4,
		});
		expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

		expect(session.userId).toBeUndefined();

		expect(session.pendingTwoFactorAttempts).toBe(1);

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();

		const deleteSessionCall = findDatabaseCall(connection, 'DELETE FROM sessions');

		expect(deleteSessionCall).toBeUndefined();

		const updateLastLoginCall = findDatabaseCall(connection, 'last_login_at');

		expect(updateLastLoginCall).toBeUndefined();
	});
});
