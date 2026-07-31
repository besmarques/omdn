import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import createAccountModule from '#server/modules/account/accountModule';

function createTestApp(auth) {
	const app = express();

	app.use((req, res, next) => {
		req.auth = auth;
		next();
	});

	app.use('/api/account', createAccountModule());

	return app;
}

describe('account routes', () => {
	it('returns the authentication data for the current account', async () => {
		const auth = {
			user: {
				id: 42,
				email: 'test@example.com',
			},
			roles: ['subscriber'],
			permissions: [],
		};

		const response = await request(createTestApp(auth)).get(
			'/api/account/me',
		);

		expect(response.status).toBe(200);

		expect(response.body).toEqual({
			status: true,
			data: auth,
		});
	});
});