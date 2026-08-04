import request from 'supertest';

import { afterEach, describe, expect, it, vi } from 'vitest';

import createApp from '#server/expressApp';

function createRateLimitStore() {
	return {
		localKeys: false,
		init: vi.fn(),
		increment: vi.fn(),
		decrement: vi.fn(),
		resetKey: vi.fn(),
	};
}

describe('Express application construction', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('constructs the HTTP application without opening a listener', () => {
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			session: {
				middleware: (_req, _res, next) => next(),
				store: {},
			},
			workers: [],
		};
		const app = createApp(
			{},
			{
				appEnvironment: 'test',
				totpEncryptionKey: Buffer.alloc(32),
			},
			services,
		);

		expect(app.locals.applicationServices).toBe(services);
		expect(app.listening).toBeUndefined();
		expect(app.listen).toBeTypeOf('function');
	});

	it('serves assets before body parsing and sessions', async () => {
		const sessionMiddleware = vi.fn((_req, _res, next) => next());
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			session: { middleware: sessionMiddleware, store: {} },
			workers: [],
		};
		const frontend = {
			assets: (_req, res) => res.type('text/javascript').send('asset'),
			publicFiles: (_req, _res, next) => next(),
			requestHandler: (_req, res) => res.type('html').send('frontend'),
		};
		const app = createApp({}, { appEnvironment: 'production', totpEncryptionKey: Buffer.alloc(32) }, services, {
			frontend,
		});

		const response = await request(app).get('/assets/application.js');

		expect(response.status).toBe(200);
		expect(response.headers['cache-control']).toBeUndefined();
		expect(response.headers['x-content-type-options']).toBe('nosniff');
		expect(sessionMiddleware).not.toHaveBeenCalled();
	});

	it('preserves correlation IDs when an API route fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const db = {
			execute: vi.fn().mockRejectedValue(new Error('database details')),
		};
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			session: { middleware: (_req, _res, next) => next(), store: {} },
			workers: [],
		};
		const app = createApp(db, { appEnvironment: 'test', totpEncryptionKey: Buffer.alloc(32) }, services);

		const response = await request(app).get('/api/test-items').set('x-correlation-id', 'middleware-order-test');

		expect(response.status).toBe(500);
		expect(response.headers['x-correlation-id']).toBe('middleware-order-test');
		expect(response.body).toEqual({
			status: false,
			message: 'Internal server error',
			correlationId: 'middleware-order-test',
		});
		expect(response.text).not.toContain('database details');
	});

	it('scopes JSON parsing and sessions to API requests', async () => {
		const sessionMiddleware = vi.fn((_req, _res, next) => next());
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			session: { middleware: sessionMiddleware, store: {} },
			workers: [],
		};
		const frontend = {
			requestHandler: (_req, res) => res.type('html').send('frontend'),
		};
		const app = createApp({}, { appEnvironment: 'test', totpEncryptionKey: Buffer.alloc(32) }, services, { frontend });

		const response = await request(app).get('/page').set('content-type', 'application/json').send('{invalid');

		expect(response.status).toBe(200);
		expect(response.text).toBe('frontend');
		expect(sessionMiddleware).not.toHaveBeenCalled();
	});
});
