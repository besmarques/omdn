import { Buffer } from 'node:buffer';

import { z } from 'zod';

const requiredString = (name) => z.string().trim().min(1, `${name} is required`);

const serverEnvironmentSchema = z.object({
	APP_ENV: z.enum(['development', 'test', 'production']),
	PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
	DB_HOST: requiredString('DB_HOST'),
	DB_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
	DB_NAME: requiredString('DB_NAME'),
	DB_USER: requiredString('DB_USER'),
	DB_PASSWORD: requiredString('DB_PASSWORD'),
	DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
	SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must contain at least 32 characters'),
	TOTP_ENCRYPTION_KEY: requiredString('TOTP_ENCRYPTION_KEY').transform((value, context) => {
		const key = Buffer.from(value, 'base64');

		if (key.length !== 32 || key.toString('base64') !== value) {
			context.addIssue({
				code: 'custom',
				message: 'TOTP_ENCRYPTION_KEY must be canonical Base64 encoding of exactly 32 bytes',
			});

			return z.NEVER;
		}

		return key;
	}),
});

function formatConfigurationError(error) {
	const details = error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n');

	return new Error(`Invalid server configuration:\n${details}`);
}

export default function loadServerConfig(environment) {
	const result = serverEnvironmentSchema.safeParse(environment);

	if (!result.success) {
		throw formatConfigurationError(result.error);
	}

	const values = result.data;

	return Object.freeze({
		appEnvironment: values.APP_ENV,
		port: values.PORT,
		database: Object.freeze({
			host: values.DB_HOST,
			port: values.DB_PORT,
			name: values.DB_NAME,
			user: values.DB_USER,
			password: values.DB_PASSWORD,
			connectionLimit: values.DB_CONNECTION_LIMIT,
		}),
		session: Object.freeze({
			secret: values.SESSION_SECRET,
			secureCookie: values.APP_ENV === 'production',
		}),
		totpEncryptionKey: values.TOTP_ENCRYPTION_KEY,
	});
}
