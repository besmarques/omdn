import express from 'express';
import request from 'supertest';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiErrorHandler, apiRequestContext } from '#server/middleware/apiErrorMiddleware';

function createTestApp() {
	const app = express();

	app.use('/api', apiRequestContext);

	app.get('/api/failure', async () => {
		throw new Error('private database details');
	});

	app.use('/api', apiErrorHandler);

	return app;
}

describe('API error middleware', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns a stable JSON error without exposing internal details', async () => {
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await request(createTestApp()).get('/api/failure');

		expect(response.status).toBe(500);
		expect(response.body).toEqual({
			status: false,
			message: 'Internal server error',
			correlationId: response.headers['x-correlation-id'],
		});
		expect(response.text).not.toContain('private database details');
		expect(errorLog).toHaveBeenCalledWith(
			'Unhandled API error',
			expect.objectContaining({
				correlationId: response.headers['x-correlation-id'],
				method: 'GET',
				path: '/api/failure',
			}),
		);
	});

	it('preserves a valid caller-supplied correlation ID', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await request(createTestApp()).get('/api/failure').set('x-correlation-id', 'client-request_123');

		expect(response.headers['x-correlation-id']).toBe('client-request_123');
		expect(response.body.correlationId).toBe('client-request_123');
	});

	it('replaces an unsafe caller-supplied correlation ID', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const response = await request(createTestApp()).get('/api/failure').set('x-correlation-id', 'unsafe id');

		expect(response.headers['x-correlation-id']).not.toBe('unsafe id');
		expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
	});
});
