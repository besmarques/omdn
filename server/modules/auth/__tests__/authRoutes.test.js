import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import createAuthModule from '#server/modules/auth/authModule';

function createTestApp(session = {}) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.session = session;
		next();
	});

	app.use('/api/auth', createAuthModule({}));

	return app;
}

describe('auth routes', () => {
	it('returns unauthenticated status for a guest', async () => {
		const app = createTestApp();

		const response = await request(app).get('/api/auth/status');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			status: true,
			authenticated: false,
		});
	});

	it('allows guests to access guest-only routes', async () => {
		const app = createTestApp();

		const response = await request(app).get('/api/auth/guest-test');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			status: true,
			message: 'This route is available only to guests',
		});
	});

	it('rejects authenticated users from guest-only routes', async () => {
		const app = createTestApp({
			userId: 1,
		});

		const response = await request(app).get('/api/auth/guest-test');

		expect(response.status).toBe(403);
		expect(response.body).toEqual({
			status: false,
			message: 'You are already authenticated',
		});
	});
});
