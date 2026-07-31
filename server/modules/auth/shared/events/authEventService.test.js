import express from 'express';
import request from 'supertest';
import { setImmediate } from 'node:timers/promises';

import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';

import createAuthEventMiddleware from '#server/modules/auth/shared/events/authEventMiddleware';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';

async function waitForEventLoop() {
	await setImmediate();
}

describe('authentication event logging', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('stores an authentication event', async () => {
		const db = {
			execute: vi
				.fn()
				.mockResolvedValue([
					{
						affectedRows: 1,
					},
				]),
		};

		const repository =
			createAuthEventRepository(db);

		await repository.create({
			userId: 42,
			sessionId: 'session-123',
			eventType: 'login_succeeded',
			success: true,
			ipAddress: '127.0.0.1',
			userAgent: 'Vitest',
			metadata: {
				statusCode: 200,
			},
		});

		expect(db.execute).toHaveBeenCalledOnce();

		const [sql, parameters] =
			db.execute.mock.calls[0];

		expect(sql).toContain(
			'INSERT INTO auth_events',
		);

		expect(sql).toContain('INET6_ATON(?)');

		expect(parameters).toEqual([
			42,
			'session-123',
			'login_succeeded',
			1,
			'127.0.0.1',
			'Vitest',
			JSON.stringify({
				statusCode: 200,
			}),
		]);
	});

	it('does not throw when event storage fails', async () => {
		const repository = {
			create: vi
				.fn()
				.mockRejectedValue(
					new Error('Database unavailable'),
				),
		};

		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		const service =
			createAuthEventService(repository);

		const result = await service.record({
			eventType: 'login_failed',
			success: false,
		});

		expect(result).toEqual({
			recorded: false,
		});

		expect(consoleError).toHaveBeenCalledWith(
			'Unable to record authentication event',
			{
				eventType: 'login_failed',
				error: 'Database unavailable',
			},
		);
	});

	it('records request information after the response finishes', async () => {
		const authEventService = {
			record: vi
				.fn()
				.mockResolvedValue({
					recorded: true,
				}),
		};

		const authEvent =
			createAuthEventMiddleware(
				authEventService,
			);

		const app = express();

		app.use(express.json());

		app.use((req, res, next) => {
			req.sessionID = 'session-123';

			req.session = {};

			next();
		});

		app.post(
			'/login',

			authEvent({
				eventType: ({ statusCode }) =>
					statusCode < 400
						? 'login_succeeded'
						: 'login_failed',

				metadata: ({ statusCode }) => ({
					statusCode,
				}),
			}),

			(req, res) => {
				req.session.userId = 42;

				return res.json({
					status: true,
				});
			},
		);

		const response = await request(app)
			.post('/login')
			.set('User-Agent', 'Vitest Browser')
			.send({
				email: 'test@example.com',
			});

		expect(response.status).toBe(200);

		await waitForEventLoop();

		expect(
			authEventService.record,
		).toHaveBeenCalledWith({
			userId: 42,
			sessionId: 'session-123',
			eventType: 'login_succeeded',
			success: true,
			ipAddress: '127.0.0.1',
			userAgent: 'Vitest Browser',
			metadata: {
				statusCode: 200,
			},
		});
	});

	it('keeps the original user for logout events', async () => {
		const authEventService = {
			record: vi
				.fn()
				.mockResolvedValue({
					recorded: true,
				}),
		};

		const authEvent =
			createAuthEventMiddleware(
				authEventService,
			);

		const app = express();

		app.use((req, res, next) => {
			req.sessionID = 'session-logout';

			req.session = {
				userId: 42,
			};

			next();
		});

		app.post(
			'/logout',

			authEvent({
				eventType: 'logout',
			}),

			(req, res) => {
				req.session = null;

				return res.json({
					status: true,
				});
			},
		);

		const response = await request(app)
			.post('/logout');

		expect(response.status).toBe(200);

		await waitForEventLoop();

		expect(
			authEventService.record,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 42,
				sessionId: 'session-logout',
				eventType: 'logout',
				success: true,
			}),
		);
	});
});