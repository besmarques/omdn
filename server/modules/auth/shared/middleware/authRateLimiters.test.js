import express from 'express';
import request from 'supertest';

import { describe, expect, it } from 'vitest';

import {
	createAccountDeletionRateLimiters,
	createEmailResendRateLimiter,
	createForgotPasswordRateLimiter,
	createLoginRateLimiter,
	createPasswordChangeRateLimiter,
	createRecoveryCodesRegenerationRateLimiters,
	createRegistrationRateLimiter,
	createTotpDisableRateLimiters,
	createTotpLoginRateLimiter,
} from '#server/modules/auth/shared/middleware/authRateLimiters';

function createTestApp(
	limiter,
	{
		auth = {
			user: {
				id: 42,
			},
		},
		responseStatus = 401,
		sessionId = 'test-session',
	} = {},
) {
	const app = express();
	const limiters = Array.isArray(limiter) ? limiter : [limiter];

	app.set('trust proxy', 1);
	app.use(express.json());

	app.use((req, res, next) => {
		const requestedUserId = req.get('x-test-user-id');

		req.auth = requestedUserId
			? {
					user: {
						id: Number(requestedUserId),
					},
				}
			: auth;
		req.sessionID = sessionId;

		next();
	});

	app.post('/test', ...limiters, (req, res) => {
		return res.status(responseStatus).json({
			status: responseStatus < 400,
		});
	});

	return app;
}

function sendAuthenticatedRequest(app, { userId, ip, responseBody = {} }) {
	return request(app).post('/test').set('x-test-user-id', String(userId)).set('x-forwarded-for', ip).send(responseBody);
}

const authenticatedOperationLimiters = [
	['TOTP disabling', createTotpDisableRateLimiters, 'Too many two-factor authentication disable attempts. Please try again later.'],
	[
		'recovery-code regeneration',
		createRecoveryCodesRegenerationRateLimiters,
		'Too many recovery code regeneration attempts. Please try again later.',
	],
	['account deletion', createAccountDeletionRateLimiters, 'Too many account deletion attempts. Please try again later.'],
];

async function sendRequests(
	app,
	count,
	body = {
		email: 'test@example.com',
	},
) {
	let response;

	for (let requestNumber = 0; requestNumber < count; requestNumber += 1) {
		response = await request(app).post('/test').send(body);
	}

	return response;
}

describe('auth rate limiters', () => {
	it.each(authenticatedOperationLimiters)('blocks the sixth failed %s attempt', async (name, createLimiters, message) => {
		const app = createTestApp(createLimiters(), {
			responseStatus: 400,
		});

		for (let attempt = 0; attempt < 5; attempt += 1) {
			await sendAuthenticatedRequest(app, {
				userId: 42,
				ip: '192.0.2.1',
			});
		}

		const response = await sendAuthenticatedRequest(app, {
			userId: 42,
			ip: '192.0.2.1',
		});

		expect(response.status).toBe(429);
		expect(response.body).toEqual({
			status: false,
			message,
		});
	});

	it.each(authenticatedOperationLimiters)('does not count successful %s requests', async (name, createLimiters) => {
		const app = createTestApp(createLimiters(), {
			responseStatus: 200,
		});

		let response;

		for (let attempt = 0; attempt < 10; attempt += 1) {
			response = await sendAuthenticatedRequest(app, {
				userId: 42,
				ip: '192.0.2.1',
			});
		}

		expect(response.status).toBe(200);
	});

	it.each(authenticatedOperationLimiters)('enforces independent per-user and per-IP counters for %s', async (name, createLimiters) => {
		const perUserApp = createTestApp(createLimiters(), {
			responseStatus: 400,
		});

		for (let attempt = 0; attempt < 5; attempt += 1) {
			await sendAuthenticatedRequest(perUserApp, {
				userId: 42,
				ip: `192.0.2.${attempt + 1}`,
			});
		}

		const userLimitedResponse = await sendAuthenticatedRequest(perUserApp, {
			userId: 42,
			ip: '192.0.2.100',
		});

		expect(userLimitedResponse.status).toBe(429);

		const perIpApp = createTestApp(createLimiters(), {
			responseStatus: 400,
		});

		for (let attempt = 0; attempt < 5; attempt += 1) {
			await sendAuthenticatedRequest(perIpApp, {
				userId: attempt + 1,
				ip: '198.51.100.1',
			});
		}

		const ipLimitedResponse = await sendAuthenticatedRequest(perIpApp, {
			userId: 100,
			ip: '198.51.100.1',
		});

		expect(ipLimitedResponse.status).toBe(429);

		const isolatedApp = createTestApp(createLimiters(), {
			responseStatus: 400,
		});

		for (let attempt = 0; attempt < 6; attempt += 1) {
			const response = await sendAuthenticatedRequest(isolatedApp, {
				userId: attempt + 1,
				ip: `203.0.113.${attempt + 1}`,
			});

			expect(response.status).toBe(400);
		}
	});

	it('blocks the fourth registration attempt', async () => {
		const app = createTestApp(createRegistrationRateLimiter(), {
			responseStatus: 201,
		});

		await sendRequests(app, 3);

		const response = await request(app).post('/test').send({
			email: 'test@example.com',
		});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message: 'Too many registration attempts. Please try again later.',
		});
	});

	it('blocks the sixth failed password change attempt', async () => {
		const app = createTestApp(createPasswordChangeRateLimiter(), {
			responseStatus: 400,
		});

		await sendRequests(app, 5, {});

		const response = await request(app).post('/test').send({});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message: 'Too many password change attempts. Please try again later.',
		});
	});

	it('does not count successful password changes', async () => {
		const app = createTestApp(createPasswordChangeRateLimiter(), {
			responseStatus: 200,
		});

		const response = await sendRequests(app, 10, {});

		expect(response.status).toBe(200);
	});

	it('blocks the sixth failed login attempt', async () => {
		const app = createTestApp(createLoginRateLimiter());

		await sendRequests(app, 5);

		const response = await request(app).post('/test').send({
			email: 'test@example.com',
		});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message: 'Too many login attempts. Please try again later.',
		});

		expect(response.headers['ratelimit-policy']).toBeDefined();

		expect(response.headers['retry-after']).toBeDefined();
	});

	it('does not count successful login requests', async () => {
		const app = createTestApp(createLoginRateLimiter(), {
			responseStatus: 200,
		});

		const response = await sendRequests(app, 10);

		expect(response.status).toBe(200);
	});

	it('blocks the fourth password reset request', async () => {
		const app = createTestApp(createForgotPasswordRateLimiter(), {
			responseStatus: 200,
		});

		await sendRequests(app, 3);

		const response = await request(app).post('/test').send({
			email: 'test@example.com',
		});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message: 'Too many password reset requests. Please try again later.',
		});
	});

	it('blocks the fourth verification email request', async () => {
		const app = createTestApp(createEmailResendRateLimiter(), {
			responseStatus: 200,
		});

		await sendRequests(app, 3);

		const response = await request(app).post('/test').send({
			email: 'test@example.com',
		});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message: 'Too many verification email requests. Please try again later.',
		});
	});

	it('blocks the sixth failed TOTP login attempt', async () => {
		const app = createTestApp(createTotpLoginRateLimiter());

		await sendRequests(app, 5, {
			code: '123456',
		});

		const response = await request(app).post('/test').send({
			code: '123456',
		});

		expect(response.status).toBe(429);

		expect(response.body).toEqual({
			status: false,
			message: 'Too many authentication attempts. Please try again later.',
		});
	});
});
