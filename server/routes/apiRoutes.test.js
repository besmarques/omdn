import express from 'express';
import request from 'supertest';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiErrorHandler, requestContext } from '#server/middleware/apiErrorMiddleware';
import createApiRoutes from '#server/routes/apiRoutes';

function createTestApp(db) {
	const app = express();

	app.use('/api', requestContext);
	app.use(express.json());
	app.use('/api', createApiRoutes(db));
	app.use('/api', apiErrorHandler);

	return app;
}

describe('API routes', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('passes repository failures to the centralized JSON error handler', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const db = {
			execute: vi.fn().mockRejectedValue(new Error('private query details')),
		};

		const response = await request(createTestApp(db)).get('/api/test-items');

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			status: false,
			message: 'Internal server error',
			correlationId: response.headers['x-correlation-id'],
		});
		expect(response.text).not.toContain('private query details');
	});

	it('keeps unmatched API routes as JSON 404 responses', async () => {
		const response = await request(createTestApp({})).get('/api/missing');

		expect(response.status).toBe(404);
		expect(response.body).toEqual({
			status: false,
			message: 'API route not found',
		});
		expect(response.headers['x-correlation-id']).toBeDefined();
	});
	it('normalizes malformed JSON errors raised before route handlers', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await request(createTestApp({})).post('/api/test-items').set('content-type', 'application/json').send('{invalid');

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			status: false,
			message: 'Internal server error',
			correlationId: response.headers['x-correlation-id'],
		});
	});
});
