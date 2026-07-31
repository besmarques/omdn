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

import createAccountModule from '#server/modules/account/accountModule';

function createSession(values = {}) {
	return {
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

function createTestApp({ db, session = createSession(), sessionId = 'current-session' }) {
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
		req.sessionID = sessionId;

		next();
	});

	app.use('/api/account', createAccountModule(db));

	return {
		app,
		session,
	};
}

describe('POST /api/account/password/change', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects invalid password change data', async () => {
		const { db } = createDatabaseMock();

		const { app } = createTestApp({
			db,
		});

		const response = await request(app).post('/api/account/password/change').send({
			currentPassword: '',
			newPassword: 'short',
			confirmPassword: 'different',
		});

		expect(response.status).toBe(400);

		expect(response.body.status).toBe(false);

		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('rejects using the current password as the new password', async () => {
		const { db } = createDatabaseMock();

		const { app } = createTestApp({
			db,
		});

		const password = 'current password value';

		const response = await request(app).post('/api/account/password/change').send({
			currentPassword: password,

			newPassword: password,

			confirmPassword: password,
		});

		expect(response.status).toBe(400);

		expect(db.getConnection).not.toHaveBeenCalled();
	});

	it('rejects an incorrect current password', async () => {
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

		const response = await request(app).post('/api/account/password/change').send({
			currentPassword: 'incorrect password value',

			newPassword: 'completely new password value',

			confirmPassword: 'completely new password value',
		});

		expect(response.status).toBe(400);

		expect(response.body).toEqual({
			status: false,
			message: 'Unable to change password',
		});

		expect(argon2.verify).toHaveBeenCalledWith('$argon2id$stored-hash', 'incorrect password value');

		expect(argon2.hash).not.toHaveBeenCalled();

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();

		expect(session.regenerate).not.toHaveBeenCalled();
	});

	it('changes the password and keeps only the regenerated session', async () => {
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

		argon2.hash.mockResolvedValueOnce('$argon2id$new-hash');

		const { app, session } = createTestApp({
			db,

			sessionId: 'current-session',
		});

		const response = await request(app).post('/api/account/password/change').send({
			currentPassword: 'current password value',

			newPassword: 'completely new password value',

			confirmPassword: 'completely new password value',
		});

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'Password changed successfully',
		});

		expect(argon2.hash).toHaveBeenCalledWith('completely new password value', {
			type: argon2.argon2id,
			memoryCost: 19456,
			timeCost: 2,
			parallelism: 1,
		});

		expect(connection.execute.mock.calls[1][1]).toEqual(['$argon2id$new-hash', 42]);

		expect(String(connection.execute.mock.calls[2][0])).toContain('DELETE FROM sessions');

		expect(connection.execute.mock.calls[2][1]).toEqual(['current-session', 42, 42]);

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(connection.rollback).not.toHaveBeenCalled();

		expect(session.regenerate).toHaveBeenCalledOnce();

		expect(session.userId).toBe(42);

		expect(session.save).toHaveBeenCalledOnce();
	});
});
