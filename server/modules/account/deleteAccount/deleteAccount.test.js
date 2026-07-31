import express from 'express';
import request from 'supertest';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('argon2', () => ({
	default: {
		verify: vi.fn(),
		hash: vi.fn(),
		argon2id: 2,
	},
}));

vi.mock('otplib', () => ({
	verify: vi.fn(),
}));

vi.mock('#server/modules/auth/totp/shared/totpEncryption', () => ({
	decryptTotpSecret: vi.fn(() => 'BASE32SECRET'),
}));

import argon2 from 'argon2';
import { verify } from 'otplib';

import createAccountModule from '#server/modules/account/accountModule';

function createSession() {
	return {
		destroy: vi.fn((callback) => callback()),
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

function createTestApp({ db, session = createSession() }) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.auth = {
			user: {
				id: 42,
				email: 'test@example.com',
			},

			roles: ['subscriber'],
			permissions: [],
		};

		req.session = session;
		req.sessionID = 'current-session';

		next();
	});

	app.use('/api/account', createAccountModule(db));

	return {
		app,
		session,
	};
}

function findConnectionCall(connection, text) {
	return connection.execute.mock.calls.find(([sql]) => String(sql).includes(text));
}

describe('DELETE /api/account', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects invalid account deletion data', async () => {
		const { db } = createDatabaseMock();

		const { app } = createTestApp({
			db,
		});

		const response = await request(app).delete('/api/account').send({
			password: '',
		});

		expect(response.status).toBe(400);

		expect(response.body.status).toBe(false);

		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('rejects an incorrect password', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute.mockResolvedValueOnce([
			[
				{
					id: 42,
					password_hash: '$argon2id$stored-hash',
				},
			],
		]);

		argon2.verify.mockResolvedValueOnce(false);

		const { app, session } = createTestApp({
			db,
		});

		const response = await request(app).delete('/api/account').send({
			password: 'incorrect password value',
		});

		expect(response.status).toBe(400);

		expect(response.body).toEqual({
			status: false,
			message: 'Unable to delete account',
		});

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();

		expect(session.destroy).not.toHaveBeenCalled();

		expect(findConnectionCall(connection, "status = 'deleted'")).toBeUndefined();
	});

	it('deletes an account without two-factor authentication', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						password_hash: '$argon2id$stored-hash',
					},
				],
			])
			.mockResolvedValueOnce([[]])
			.mockResolvedValue([
				{
					affectedRows: 1,
				},
			]);

		argon2.verify.mockResolvedValueOnce(true);

		const { app, session } = createTestApp({
			db,
		});

		const response = await request(app).delete('/api/account').send({
			password: 'current password value',
		});

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'Account deleted successfully',
		});

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(connection.rollback).not.toHaveBeenCalled();

		expect(session.destroy).toHaveBeenCalledOnce();

		const deleteUserCall = findConnectionCall(connection, "status = 'deleted'");

		expect(deleteUserCall).toBeDefined();

		expect(deleteUserCall[1]).toEqual([42]);

		const deleteSessionsCall = findConnectionCall(connection, 'DELETE FROM sessions');

		expect(deleteSessionsCall).toBeDefined();

		expect(deleteSessionsCall[1]).toEqual([42, 42]);

		expect(response.headers['set-cookie'][0]).toContain('omdn_session=;');
	});

	it('requires a valid TOTP code when two-factor authentication is enabled', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						password_hash: '$argon2id$stored-hash',
					},
				],
			])
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
			]);

		argon2.verify.mockResolvedValueOnce(true);

		verify.mockResolvedValueOnce({
			valid: false,
		});

		const { app, session } = createTestApp({
			db,
		});

		const response = await request(app).delete('/api/account').send({
			password: 'current password value',

			code: '123456',
		});

		expect(response.status).toBe(400);

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();

		expect(session.destroy).not.toHaveBeenCalled();

		expect(findConnectionCall(connection, "status = 'deleted'")).toBeUndefined();
	});

	it('deletes an account using a valid TOTP code', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						password_hash: '$argon2id$stored-hash',
					},
				],
			])
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
			.mockResolvedValue([
				{
					affectedRows: 1,
				},
			]);

		argon2.verify.mockResolvedValueOnce(true);

		verify.mockResolvedValueOnce({
			valid: true,
			timeStep: 101,
		});

		const { app, session } = createTestApp({
			db,
		});

		const response = await request(app).delete('/api/account').send({
			password: 'current password value',

			code: '123456',
		});

		expect(response.status).toBe(200);

		expect(verify).toHaveBeenCalledWith(
			expect.objectContaining({
				secret: 'BASE32SECRET',

				token: '123456',

				afterTimeStep: 100,
			}),
		);

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(session.destroy).toHaveBeenCalledOnce();

		expect(findConnectionCall(connection, "status = 'deleted'")).toBeDefined();
	});

	it('deletes an account using a valid recovery code', async () => {
		const { db, connection } = createDatabaseMock();

		connection.execute
			.mockResolvedValueOnce([
				[
					{
						id: 42,
						password_hash: '$argon2id$stored-hash',
					},
				],
			])
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
				[
					{
						id: 7,
					},
				],
			])
			.mockResolvedValue([
				{
					affectedRows: 1,
				},
			]);

		argon2.verify.mockResolvedValueOnce(true);

		const { app, session } = createTestApp({
			db,
		});

		const response = await request(app).delete('/api/account').send({
			password: 'current password value',

			code: 'RECOVERY-CODE-1234',
		});

		expect(response.status).toBe(200);

		expect(findConnectionCall(connection, 'code_hash = ?')).toBeDefined();

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(session.destroy).toHaveBeenCalledOnce();
	});
});
