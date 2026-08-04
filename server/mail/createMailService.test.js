import { describe, expect, it, vi } from 'vitest';

import createMailService from '#server/mail/createMailService';

function createConfig(overrides = {}) {
	return {
		appEnvironment: 'production',
		publicBaseUrl: 'https://example.com',
		smtp: {
			enabled: true,
			fromEmail: 'accounts@example.com',
			fromName: 'OMDN',
			host: 'smtp.example.com',
			password: 'secret',
			port: 587,
			secure: false,
			user: 'smtp-user',
		},
		...overrides,
	};
}

describe('mail service', () => {
	it('sends an account-verification message through the configured SMTP transport', async () => {
		const sendMail = vi.fn().mockResolvedValue({ messageId: 'message-1' });
		const createTransport = vi.fn(() => ({ sendMail }));
		const service = createMailService(createConfig(), { createTransport });

		await expect(
			service.sendAccountVerification({
				displayName: 'Test User',
				email: 'user@example.com',
				token: 'verification-token',
			}),
		).resolves.toEqual({ delivered: true, messageId: 'message-1' });

		expect(createTransport).toHaveBeenCalledWith({
			auth: { pass: 'secret', user: 'smtp-user' },
			host: 'smtp.example.com',
			port: 587,
			secure: false,
		});
		expect(sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: { address: 'accounts@example.com', name: 'OMDN' },
				subject: 'Verify your O Melhor do Natal account',
				to: 'user@example.com',
			}),
		);
		expect(sendMail.mock.calls[0][0].text).toContain('https://example.com/verify-email?token=verification-token');
	});

	it('keeps the development token fallback when SMTP is disabled', async () => {
		const logger = { log: vi.fn() };
		const service = createMailService(createConfig({ appEnvironment: 'development', smtp: { enabled: false } }), {
			createTransport: vi.fn(),
			logger,
		});

		await expect(service.sendAccountVerification({ email: 'user@example.com', token: 'development-token' })).resolves.toEqual({
			delivered: false,
			developmentFallback: true,
		});
		expect(logger.log).toHaveBeenCalledWith('Verification token for user@example.com: development-token');
	});
});
