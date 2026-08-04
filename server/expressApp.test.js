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
			resolvePrincipal: (_req, _res, next) => next(),
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
			resolvePrincipal: (_req, _res, next) => next(),
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
			resolvePrincipal: (_req, _res, next) => next(),
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
			resolvePrincipal: (_req, _res, next) => next(),
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

	it('delegates every page request to the frontend handler', async () => {
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			framework: Object.freeze({}),
			resolvePrincipal: (_req, _res, next) => next(),
			session: { middleware: (_req, _res, next) => next(), store: {} },
			workers: [],
		};
		const frontend = {
			requestHandler: vi.fn((_req, res) => {
				res.sendStatus(204);
			}),
		};
		const app = createApp({}, { appEnvironment: 'test', totpEncryptionKey: Buffer.alloc(32) }, services, { frontend });

		await request(app).get('/first').set('x-correlation-id', 'first');
		await request(app).get('/second').set('x-correlation-id', 'second');

		expect(frontend.requestHandler).toHaveBeenCalledTimes(2);
	});

	it('resolves sessions only for private document and data requests', async () => {
		const sessionMiddleware = vi.fn((req, _res, next) => {
			req.session = { userId: 1 };
			next();
		});
		const resolvePrincipal = vi.fn((_req, _res, next) => next());
		const services = {
			authenticated: (_req, _res, next) => next(),
			authEventService: { record: vi.fn() },
			createRateLimitStore,
			framework: Object.freeze({}),
			resolvePrincipal,
			session: { middleware: sessionMiddleware, store: {} },
			workers: [],
		};
		const frontend = {
			requestHandler: (_req, res) => res.sendStatus(204),
		};
		const app = createApp({}, { appEnvironment: 'test', totpEncryptionKey: Buffer.alloc(32) }, services, { frontend });

		await request(app).get('/');
		await request(app).get('/admin');
		await request(app).get('/admin.data');

		expect(sessionMiddleware).toHaveBeenCalledTimes(2);
		expect(resolvePrincipal).toHaveBeenCalledTimes(2);
	});
});
