import express from 'express';
import request from 'supertest';

import {
	describe,
	expect,
	it,
} from 'vitest';

import {
	createEmailResendRateLimiter,
	createForgotPasswordRateLimiter,
	createLoginRateLimiter,
	createTotpLoginRateLimiter,
} from '#server/modules/auth/shared/middleware/authRateLimiters';

function createTestApp(
	limiter,
	{
		responseStatus = 401,
		sessionId = 'test-session',
	} = {},
) {
	const app = express();

	app.use(express.json());

	app.use((req, res, next) => {
		req.sessionID = sessionId;

		next();
	});

	app.post(
		'/test',
		limiter,
		(req, res) => {
			return res
				.status(responseStatus)
				.json({
					status:
						responseStatus < 400,
				});
		},
	);

	return app;
}

async function sendRequests(
	app,
	count,
	body = {
		email: 'test@example.com',
	},
) {
	let response;

	for (
		let requestNumber = 0;
		requestNumber < count;
		requestNumber += 1
	) {
		response = await request(app)
			.post('/test')
			.send(body);
	}

	return response;
}

describe('auth rate limiters', () => {
	it('blocks the sixth failed login attempt', async () => {
		const app = createTestApp(
			createLoginRateLimiter(),
		);

		await sendRequests(app, 5);

		const response = await request(app)
			.post('/test')
			.send({
				email: 'test@example.com',
			});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message:
				'Too many login attempts. Please try again later.',
		});

		expect(
			response.headers['ratelimit-policy'],
		).toBeDefined();

		expect(
			response.headers['retry-after'],
		).toBeDefined();
	});

	it('does not count successful login requests', async () => {
		const app = createTestApp(
			createLoginRateLimiter(),
			{
				responseStatus: 200,
			},
		);

		const response = await sendRequests(
			app,
			10,
		);

		expect(response.status).toBe(200);
	});

	it('blocks the fourth password reset request', async () => {
		const app = createTestApp(
			createForgotPasswordRateLimiter(),
			{
				responseStatus: 200,
			},
		);

		await sendRequests(app, 3);

		const response = await request(app)
			.post('/test')
			.send({
				email: 'test@example.com',
			});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message:
				'Too many password reset requests. Please try again later.',
		});
	});

	it('blocks the fourth verification email request', async () => {
		const app = createTestApp(
			createEmailResendRateLimiter(),
			{
				responseStatus: 200,
			},
		);

		await sendRequests(app, 3);

		const response = await request(app)
			.post('/test')
			.send({
				email: 'test@example.com',
			});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message:
				'Too many verification email requests. Please try again later.',
		});
	});

	it('blocks the sixth failed TOTP login attempt', async () => {
		const app = createTestApp(
			createTotpLoginRateLimiter(),
		);

		await sendRequests(
			app,
			5,
			{
				code: '123456',
			},
		);

		const response = await request(app)
			.post('/test')
			.send({
				code: '123456',
			});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message:
				'Too many authentication attempts. Please try again later.',
		});
	});
});