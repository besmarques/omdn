import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import loadServerConfig from '#server/config/serverConfig';

function createEnvironment(overrides = {}) {
	return {
		APP_ENV: 'production',
		PORT: '3000',
		PUBLIC_BASE_URL: 'https://example.com',
		DB_HOST: 'localhost',
		DB_PORT: '3306',
		DB_NAME: 'omdn',
		DB_USER: 'omdn_user',
		DB_PASSWORD: 'database-password',
		DB_CONNECTION_LIMIT: '10',
		SESSION_SECRET: 'a'.repeat(32),
		SMTP_HOST: 'smtp.example.com',
		SMTP_PORT: '587',
		SMTP_SECURE: 'false',
		SMTP_USER: 'smtp-user',
		SMTP_PASSWORD: 'smtp-password',
		SMTP_FROM_EMAIL: 'accounts@example.com',
		SMTP_FROM_NAME: 'OMDN',
		TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
		...overrides,
	};
}

describe('server configuration', () => {
	it('normalizes a valid environment', () => {
		const config = loadServerConfig(createEnvironment());

		expect(config).toMatchObject({
			appEnvironment: 'production',
			port: 3000,
			database: {
				host: 'localhost',
				port: 3306,
				name: 'omdn',
				user: 'omdn_user',
				password: 'database-password',
				connectionLimit: 10,
			},
			session: {
				secret: 'a'.repeat(32),
				secureCookie: true,
			},
			publicBaseUrl: 'https://example.com',
			smtp: {
				enabled: true,
				fromEmail: 'accounts@example.com',
				fromName: 'OMDN',
				host: 'smtp.example.com',
				port: 587,
				secure: false,
				user: 'smtp-user',
			},
		});
		expect(config.totpEncryptionKey).toEqual(Buffer.alloc(32, 7));
	});

	it('applies numeric defaults', () => {
		const environment = createEnvironment();
		delete environment.PORT;
		delete environment.DB_PORT;
		delete environment.DB_CONNECTION_LIMIT;

		const config = loadServerConfig(environment);

		expect(config.port).toBe(3000);
		expect(config.database.port).toBe(3306);
		expect(config.database.connectionLimit).toBe(10);
	});

	it('rejects an unsupported application environment', () => {
		expect(() => loadServerConfig(createEnvironment({ APP_ENV: 'staging' }))).toThrow('APP_ENV: Invalid option');
	});

	it('rejects invalid numeric ranges', () => {
		expect(() => loadServerConfig(createEnvironment({ PORT: '70000' }))).toThrow('PORT: Too big');
	});

	it('rejects weak session secrets', () => {
		expect(() => loadServerConfig(createEnvironment({ SESSION_SECRET: 'short' }))).toThrow(
			'SESSION_SECRET must contain at least 32 characters',
		);
	});

	it('requires SMTP delivery configuration in production', () => {
		expect(() =>
			loadServerConfig(
				createEnvironment({
					PUBLIC_BASE_URL: undefined,
					SMTP_FROM_EMAIL: undefined,
					SMTP_HOST: undefined,
				}),
			),
		).toThrow('PUBLIC_BASE_URL is required in production');
	});

	it('allows the token-log fallback only outside production', () => {
		const config = loadServerConfig(
			createEnvironment({
				APP_ENV: 'development',
				PUBLIC_BASE_URL: undefined,
				SMTP_FROM_EMAIL: undefined,
				SMTP_HOST: undefined,
				SMTP_PASSWORD: undefined,
				SMTP_USER: undefined,
			}),
		);

		expect(config.publicBaseUrl).toBe('http://localhost:3000');
		expect(config.smtp.enabled).toBe(false);
	});

	it('requires SMTP credentials to be configured as a pair', () => {
		expect(() => loadServerConfig(createEnvironment({ SMTP_PASSWORD: undefined }))).toThrow(
			'SMTP_USER and SMTP_PASSWORD must be configured together',
		);
	});

	it('rejects malformed or incorrectly sized TOTP keys', () => {
		expect(() => loadServerConfig(createEnvironment({ TOTP_ENCRYPTION_KEY: 'not-base64' }))).toThrow(
			'TOTP_ENCRYPTION_KEY must be canonical Base64 encoding of exactly 32 bytes',
		);
	});

	it('does not include secret values in validation errors', () => {
		const password = 'do-not-print-this-password';

		try {
			loadServerConfig(createEnvironment({ DB_PASSWORD: password, PORT: 'invalid' }));
		} catch (error) {
			expect(error.message).not.toContain(password);
		}
	});
});
