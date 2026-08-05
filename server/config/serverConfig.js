import { Buffer } from 'node:buffer';
import path from 'node:path';

import { z } from 'zod';

const requiredString = (name) => z.string().trim().min(1, `${name} is required`);
const optionalString = z.string().trim().min(1).optional();
const environmentBoolean = z
	.enum(['true', 'false'])
	.default('false')
	.transform((value) => value === 'true');

const serverEnvironmentSchema = z
	.object({
		APP_ENV: z.enum(['development', 'test', 'production']),
		PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
		PUBLIC_BASE_URL: z.url().optional(),
		DB_HOST: requiredString('DB_HOST'),
		DB_PORT: z.coerce.number().int().min(1).max(65_535).default(3306),
		DB_NAME: requiredString('DB_NAME'),
		DB_USER: requiredString('DB_USER'),
		DB_PASSWORD: requiredString('DB_PASSWORD'),
		DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
		SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must contain at least 32 characters'),
		SMTP_HOST: optionalString,
		SMTP_DISABLE_DELIVERY: environmentBoolean,
		SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
		SMTP_SECURE: environmentBoolean,
		SMTP_USER: optionalString,
		SMTP_PASSWORD: optionalString,
		SMTP_FROM_EMAIL: z.email().optional(),
		SMTP_FROM_NAME: z.string().trim().min(1).default('O Melhor do Natal'),
		MEDIA_STORAGE_PATH: optionalString,
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
	})
	.superRefine((values, context) => {
		if (values.APP_ENV === 'production') {
			for (const field of ['PUBLIC_BASE_URL', 'SMTP_HOST', 'SMTP_FROM_EMAIL']) {
				if (!values[field]) {
					context.addIssue({ code: 'custom', message: `${field} is required in production`, path: [field] });
				}
			}
		}

		if (values.SMTP_HOST && !values.SMTP_FROM_EMAIL) {
			context.addIssue({
				code: 'custom',
				message: 'SMTP_FROM_EMAIL is required when SMTP_HOST is configured',
				path: ['SMTP_FROM_EMAIL'],
			});
		}

		if (Boolean(values.SMTP_USER) !== Boolean(values.SMTP_PASSWORD)) {
			context.addIssue({
				code: 'custom',
				message: 'SMTP_USER and SMTP_PASSWORD must be configured together',
				path: ['SMTP_USER'],
			});
		}
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
		publicBaseUrl: values.PUBLIC_BASE_URL ?? `http://localhost:${values.PORT}`,
		mediaStoragePath: path.resolve(values.MEDIA_STORAGE_PATH ?? 'storage/media'),
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
		smtp: Object.freeze({
			enabled: Boolean(values.SMTP_HOST) && !values.SMTP_DISABLE_DELIVERY,
			host: values.SMTP_HOST,
			port: values.SMTP_PORT,
			secure: values.SMTP_SECURE,
			user: values.SMTP_USER,
			password: values.SMTP_PASSWORD,
			fromEmail: values.SMTP_FROM_EMAIL,
			fromName: values.SMTP_FROM_NAME,
		}),
		totpEncryptionKey: values.TOTP_ENCRYPTION_KEY,
	});
}
