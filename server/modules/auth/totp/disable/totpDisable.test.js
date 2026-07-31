import express from 'express';
import request from 'supertest';
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

vi.mock('argon2', () => ({
	default: {
		argon2id: 2,
		hash: vi.fn(),
		verify: vi.fn(),
	},
}));

vi.mock('otplib', () => ({
	generateSecret: vi.fn(),
	generateURI: vi.fn(),
	verify: vi.fn(),
}));

vi.mock(
	'#server/modules/auth/totp/shared/totpEncryption',
	() => ({
		encryptTotpSecret: vi.fn(),
		decryptTotpSecret: vi.fn(
			() => 'BASE32SECRET',
		),
	}),
);

import argon2 from 'argon2';
import { verify } from 'otplib';

import createAuthModule from '#server/modules/auth/authModule';

function createDatabaseMock() {
	const connection = {
		execute: vi.fn(),
		beginTransaction:
			vi.fn().mockResolvedValue(),
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
						email_verified_at:
							new Date(),
						last_login_at: null,
						created_at: new Date(),
					},
				],
			])
			.mockResolvedValueOnce([[]])
			.mockResolvedValueOnce([[]]),

		getConnection:
			vi.fn().mockResolvedValue(connection),
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

describe('POST /api/auth/totp/disable', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects invalid request data', async () => {
		const { db } = createDatabaseMock();
		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/totp/disable')
			.send({
				password: '',
				code: '',
			});

		expect(response.status).toBe(400);
		expect(response.body.status).toBe(false);

		expect(
			db.getConnection,
		).not.toHaveBeenCalled();
	});

	it('rejects an incorrect current password', async () => {
		const { db, connection } =
			createDatabaseMock();

		connection.execute.mockResolvedValueOnce([
			[
				{
					id: 42,
					password_hash:
						'$argon2id$stored-hash',
				},
			],
		]);

		argon2.verify.mockResolvedValueOnce(false);

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/totp/disable')
			.send({
				password:
					'incorrect current password',
				code: '123456',
			});

		expect(response.status).toBe(400);

		expect(argon2.verify).toHaveBeenCalledWith(
			'$argon2id$stored-hash',
			'incorrect current password',
		);

		expect(
			connection.rollback,
		).toHaveBeenCalledOnce();

		expect(
			connection.commit,
		).not.toHaveBeenCalled();
	});

	it('disables TOTP with a valid authenticator code', async () => {
		const { db, connection } =
			createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						password_hash:
							'$argon2id$stored-hash',
					},
				],
			])
			.mockResolvedValueOnce([
				[
					{
						user_id: 42,
						secret_encrypted:
							'encrypted',
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
					affectedRows: 10,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 1,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 2,
				},
			]);

		argon2.verify.mockResolvedValueOnce(true);

		verify.mockResolvedValueOnce({
			valid: true,
			timeStep: 101,
		});

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/totp/disable')
			.send({
				password:
					'correct current password',
				code: '123456',
			});

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message:
				'Two-factor authentication disabled',
		});

		expect(verify).toHaveBeenCalledWith(
			expect.objectContaining({
				secret: 'BASE32SECRET',
				token: '123456',
				afterTimeStep: 100,
			}),
		);

		expect(
			connection.execute.mock.calls[2][1],
		).toEqual([42]);

		expect(
			connection.execute.mock.calls[3][1],
		).toEqual([42]);

		expect(
			connection.execute.mock.calls[4][1],
		).toEqual([
			'current-session',
			42,
			42,
		]);

		expect(
			connection.commit,
		).toHaveBeenCalledOnce();

		expect(
			connection.rollback,
		).not.toHaveBeenCalled();
	});

	it('disables TOTP with a valid recovery code', async () => {
		const { db, connection } =
			createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						password_hash:
							'$argon2id$stored-hash',
					},
				],
			])
			.mockResolvedValueOnce([
				[
					{
						user_id: 42,
						secret_encrypted:
							'encrypted',
						algorithm: 'SHA1',
						digits: 6,
						period: 30,
						is_enabled: 1,
						last_used_step: 100,
					},
				],
			])
			.mockResolvedValueOnce([
				[
					{
						id: 9,
					},
				],
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 10,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 1,
				},
			])
			.mockResolvedValueOnce([
				{
					affectedRows: 2,
				},
			]);

		argon2.verify.mockResolvedValueOnce(true);

		const app = createTestApp(db);

		const response = await request(app)
			.post('/api/auth/totp/disable')
			.send({
				password:
					'correct current password',
				code: 'AAAA-BBBB-CCCC-DDDD-EEEE',
			});

		expect(response.status).toBe(200);

		expect(verify).not.toHaveBeenCalled();

		expect(
			connection.execute.mock.calls[2][1],
		).toEqual([
			42,
			expect.stringMatching(/^[a-f0-9]{64}$/),
		]);

		expect(
			connection.commit,
		).toHaveBeenCalledOnce();
	});
});