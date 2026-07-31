import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import createAuthModule from '#server/modules/auth/authModule';

function createTestApp(db) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = {
			userId: 42,
		};

		next();
	});

	app.use('/api/auth', createAuthModule(db));

	return app;
}

function createAuthenticatedDatabaseMock(totpRecord) {
	return {
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
			.mockResolvedValueOnce([[]])
			.mockResolvedValueOnce([totpRecord ? [totpRecord] : []]),
	};
}

describe('GET /api/auth/totp/status', () => {
	it('returns disabled when no TOTP record exists', async () => {
		const db = createAuthenticatedDatabaseMock(null);

		const app = createTestApp(db);

		const response = await request(app).get('/api/auth/totp/status');

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			data: {
				enabled: false,
			},
		});

		expect(db.execute.mock.calls[3][1]).toEqual([42]);
	});

	it('returns enabled when TOTP is active', async () => {
		const db = createAuthenticatedDatabaseMock({
			user_id: 42,
			secret_encrypted: 'encrypted-secret',
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			is_enabled: 1,
			verified_at: new Date(),
			last_used_step: 100,
		});

		const app = createTestApp(db);

		const response = await request(app).get('/api/auth/totp/status');

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			data: {
				enabled: true,
			},
		});
	});
});
