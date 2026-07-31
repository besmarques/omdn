import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import createAdminModule from '#server/modules/admin/adminModule';

function createTestApp(auth) {
	const app = express();

	app.use((req, res, next) => {
		req.auth = auth;
		next();
	});

	app.use('/api/admin', createAdminModule());

	return app;
}

describe('admin routes', () => {
	it('rejects an account without the required permission', async () => {
		const response = await request(
			createTestApp({
				permissions: [],
			}),
		).get('/api/admin/test');

		expect(response.status).toBe(403);

		expect(response.body).toEqual({
			status: false,
			message:
				'You do not have permission to perform this action',
		});
	});

	it('allows an account with the required permission', async () => {
		const response = await request(
			createTestApp({
				permissions: ['users.manage'],
			}),
		).get('/api/admin/test');

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			message: 'You have access to this admin route',
		});
	});
});