import express from 'express';
import request from 'supertest';

import { describe, expect, it } from 'vitest';

import createSecurityHeaders from '#server/middleware/securityHeaders';

function createTestApp(production) {
	const app = express();

	app.use(createSecurityHeaders({ production }));
	app.get('/', (_req, res) => res.sendStatus(204));

	return app;
}

describe('security headers', () => {
	it('sets the baseline headers on every response', async () => {
		const response = await request(createTestApp(false)).get('/');

		expect(response.headers['permissions-policy']).toBe('camera=(), geolocation=(), microphone=()');
		expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(response.headers['x-content-type-options']).toBe('nosniff');
		expect(response.headers['x-frame-options']).toBe('DENY');
		expect(response.headers['strict-transport-security']).toBeUndefined();
	});

	it('sets HSTS only in production', async () => {
		const response = await request(createTestApp(true)).get('/');

		expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
		expect(response.headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/u);
	});
});
