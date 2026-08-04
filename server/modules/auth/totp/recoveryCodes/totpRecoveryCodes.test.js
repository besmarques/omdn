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

function createDatabaseMock() {
	const connection = {
		execute: vi.fn(),
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		rollback: vi.fn().mockResolvedValue(),
		release: vi.fn(),
	};

	const db = {
		execute: vi
			.fn()
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						email: 'test@example.com',
						display_name: 'Test User',
						status: 'active',
						email_verified_at: new Date(),
						last_login_at: null,
						created_at: new Date(),
					},
				],
			])
			.mockResolvedValueOnce([[]])
			.mockResolvedValueOnce([[]]),

		getConnection: vi.fn().mockResolvedValue(connection),
	};

	return {
		db,
		connection,
	};
}

function createTestApp(db) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = {
			userId: 42,
		};
		req.sessionID = 'current-session';

		next();
	});

	app.use('/api/auth', createAuthModule(db));

	return app;
}

describe('POST /api/auth/totp/recovery-codes/regenerate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects an invalid authentication code format', async () => {
		const { db } = createDatabaseMock();

		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/totp/recovery-codes/regenerate').send({
			code: 'invalid',
		});

		expect(response.status).toBe(400);

		expect(response.body).toEqual({
			status: false,
			message: 'Invalid authentication code',
		});

		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('rejects an invalid or reused TOTP code', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([
			[
				{
					user_id: 42,
					secret_encrypted: 'encrypted',
					algorithm: 'SHA1',
					digits: 6,
					period: 30,
					is_enabled: 1,
					verified_at: new Date(),
					last_used_step: 100,
				},
			],
		]);

		verify.mockResolvedValueOnce({
			valid: false,
		});

		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/totp/recovery-codes/regenerate').send({
			code: '123456',
		});

		expect(response.status).toBe(400);

		expect(response.body).toEqual({
			status: false,
			message: 'Invalid authentication code or TOTP is not enabled',
		});

		expect(verify).toHaveBeenCalledWith(
			expect.objectContaining({
				secret: 'BASE32SECRET',
				token: '123456',
				afterTimeStep: 100,
			}),
		);

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();
	});

	it('invalidates old recovery codes and returns new codes once', async () => {
		const { db, connection } = createDatabaseMock();

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
						verified_at: new Date(),
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
				{
					affectedRows: 10,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 10,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 2,
				},
			]);

		verify.mockResolvedValueOnce({
			valid: true,
			timeStep: 101,
			epoch: 3030,
			delta: 0,
		});

		const app = createTestApp(db);

		const response = await request(app).post('/api/auth/totp/recovery-codes/regenerate').send({
			code: '123456',
		});

		expect(response.status).toBe(200);
		expect(response.body.status).toBe(true);

		expect(response.body.data.recoveryCodes).toHaveLength(10);

		expect(response.body.data.recoveryCodes).toEqual(expect.arrayContaining([expect.any(String)]));

		expect(connection.execute.mock.calls[1][1]).toEqual([101, 42, 101]);

		expect(connection.execute.mock.calls[2][1]).toEqual([42]);

		const insertParameters = connection.execute.mock.calls[3][1];

		expect(insertParameters).toHaveLength(20);

		for (let index = 0; index < insertParameters.length; index += 2) {
			expect(insertParameters[index]).toBe(42);

			expect(insertParameters[index + 1]).toMatch(/^[a-f0-9]{64}$/);
		}

		expect(connection.execute.mock.calls[4][1]).toEqual(['current-session', 42]);

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(connection.rollback).not.toHaveBeenCalled();
	});
});
