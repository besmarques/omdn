import { setImmediate } from 'node:timers/promises';

import express from 'express';
import request from 'supertest';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import createAuthEventPolicy from '#server/modules/auth/shared/events/authEventPolicy';

function createAuthEventServiceMock() {
	return {
		record: vi.fn().mockResolvedValue({
			recorded: true,
		}),
	};
}

function createApp(authEventService) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.sessionID = 'session-123';
		req.session = {};

		next();
	});

	app.use(createAuthEventPolicy(authEventService));

	return app;
}

describe('authentication event policy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('records a successful login', async () => {
		const authEventService = createAuthEventServiceMock();

		const app = createApp(authEventService);

		app.post('/login', (req, res) => {
			req.session.userId = 42;

			return res.json({
				status: true,
			});
		});

		const response = await request(app).post('/login').send({
			email: 'test@example.com',
			password: 'not-recorded',
		});

		expect(response.status).toBe(200);

		await setImmediate();

		expect(authEventService.record).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 42,
				sessionId: 'session-123',
				eventType: 'login_succeeded',
				success: true,
				metadata: {
					statusCode: 200,
					rateLimited: false,
				},
			}),
		);
	});

	it('records a pending two-factor login', async () => {
		const authEventService = createAuthEventServiceMock();

		const app = createApp(authEventService);

		app.post('/login', (req, res) => {
			req.session.pendingTwoFactorUserId = 42;

			return res.status(202).json({
				status: true,
			});
		});

		const response = await request(app).post('/login').send({
			email: 'test@example.com',
			password: 'not-recorded',
		});

		expect(response.status).toBe(202);

		await setImmediate();

		expect(authEventService.record).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 42,
				eventType: 'login_two_factor_required',
				success: true,
			}),
		);
	});

	it('records rate-limited login attempts', async () => {
		const authEventService = createAuthEventServiceMock();

		const app = createApp(authEventService);

		app.post('/login', (req, res) => {
			return res.status(429).json({
				status: false,
			});
		});

		const response = await request(app).post('/login');

		expect(response.status).toBe(429);

		await setImmediate();

		expect(authEventService.record).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'login_failed',
				success: false,
				metadata: {
					statusCode: 429,
					rateLimited: true,
				},
			}),
		);
	});

	it('uses the affected user from response locals', async () => {
		const authEventService = createAuthEventServiceMock();

		const app = createApp(authEventService);

		app.post('/password/reset', (req, res) => {
			res.locals.authEventUserId = 77;

			return res.json({
				status: true,
			});
		});

		const response = await request(app).post('/password/reset');

		expect(response.status).toBe(200);

		await setImmediate();

		expect(authEventService.record).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 77,
				eventType: 'password_reset_completed',
				success: true,
			}),
		);
	});

	it('ignores routes without an audit policy', async () => {
		const authEventService = createAuthEventServiceMock();

		const app = createApp(authEventService);

		app.get('/status', (req, res) => {
			return res.json({
				status: true,
			});
		});

		const response = await request(app).get('/status');

		expect(response.status).toBe(200);

		await setImmediate();

		expect(authEventService.record).not.toHaveBeenCalled();
	});
});
