import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { issueCsrfToken, requireCsrfProtection } from '#server/middleware/csrfMiddleware';

function createTestApp() {
	const app = express();

	app.use(
		session({
			secret: 'csrf-test-session-secret-with-32-characters',
			resave: false,
			saveUninitialized: false,
		}),
	);
	app.get('/csrf', issueCsrfToken);
	app.use(requireCsrfProtection);
	app.get('/protected', (req, res) => res.json({ status: true }));
	app.post('/protected', (req, res) => res.json({ status: true }));

	return app;
}

describe('CSRF middleware', () => {
	it('issues and reuses an unpredictable session-bound token without caching', async () => {
		const agent = request.agent(createTestApp());
		const firstResponse = await agent.get('/csrf');
		const secondResponse = await agent.get('/csrf');

		expect(firstResponse.status).toBe(200);
		expect(firstResponse.headers['cache-control']).toBe('private, no-store');
		expect(firstResponse.body.data.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(secondResponse.body.data.csrfToken).toBe(firstResponse.body.data.csrfToken);
	});

	it('accepts a valid token for an unsafe request', async () => {
		const agent = request.agent(createTestApp());
		const tokenResponse = await agent.get('/csrf');
		const response = await agent.post('/protected').set('x-csrf-token', tokenResponse.body.data.csrfToken);

		expect(response.status).toBe(200);
	});

	it.each([undefined, 'invalid-token'])('rejects an unsafe request with token %s', async (token) => {
		const agent = request.agent(createTestApp());

		await agent.get('/csrf');

		const pendingRequest = agent.post('/protected');

		if (token) {
			pendingRequest.set('x-csrf-token', token);
		}

		const response = await pendingRequest;

		expect(response.status).toBe(403);
		expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
	});

	it('rejects a valid token from a different browser origin', async () => {
		const agent = request.agent(createTestApp());
		const tokenResponse = await agent.get('/csrf');
		const response = await agent
			.post('/protected')
			.set('origin', 'https://attacker.example')
			.set('x-csrf-token', tokenResponse.body.data.csrfToken);

		expect(response.status).toBe(403);
		expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
	});

	it('accepts a browser same-origin request after a proxy rewrites the host', async () => {
		const agent = request.agent(createTestApp());
		const tokenResponse = await agent.get('/csrf');
		const response = await agent
			.post('/protected')
			.set('origin', 'http://127.0.0.1:5173')
			.set('sec-fetch-site', 'same-origin')
			.set('x-csrf-token', tokenResponse.body.data.csrfToken);

		expect(response.status).toBe(200);
	});

	it('rejects cross-site browser requests even when the token is valid', async () => {
		const agent = request.agent(createTestApp());
		const tokenResponse = await agent.get('/csrf');
		const response = await agent
			.post('/protected')
			.set('origin', 'https://attacker.example')
			.set('sec-fetch-site', 'cross-site')
			.set('x-csrf-token', tokenResponse.body.data.csrfToken);

		expect(response.status).toBe(403);
	});

	it('allows safe requests without a token', async () => {
		const response = await request(createTestApp()).get('/protected');

		expect(response.status).toBe(200);
	});
});
