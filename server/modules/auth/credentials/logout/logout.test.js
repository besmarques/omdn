import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import createAuthModule from '#server/modules/auth/authModule';

function createTestApp(session) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = session;
		next();
	});

	app.use('/api/auth', createAuthModule({}));

	app.use((error, req, res, next) => {
		void req;
		void next;

		res.status(500).json({
			status: false,
			message: error.message,
		});
	});

	return app;
}

describe('POST /api/auth/logout', () => {
	it('destroys the session and clears the cookie', async () => {
		const destroy = vi.fn((callback) => callback());

		const response = await request(
			createTestApp({
				userId: 42,
				destroy,
			}),
		).post('/api/auth/logout');

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'Logout successful',
		});

		expect(destroy).toHaveBeenCalledOnce();

		expect(response.headers['set-cookie'][0]).toContain(
			'omdn_session=;',
		);
	});

	it('returns success when no session exists', async () => {
		const response = await request(
			createTestApp(undefined),
		).post('/api/auth/logout');

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'Logout successful',
		});
	});

	it('passes session destruction errors to the error handler', async () => {
		const destroy = vi.fn((callback) => {
			callback(new Error('Session destruction failed'));
		});

		const response = await request(
			createTestApp({
				userId: 42,
				destroy,
			}),
		).post('/api/auth/logout');

		expect(response.status).toBe(500);

		expect(response.body).toEqual({
			status: false,
			message: 'Session destruction failed',
		});
	});
});