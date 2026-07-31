import { z } from 'zod';

export const registerSchema = z.object({
	displayName: z
		.string()
		.trim()
		.min(2, 'Display name must contain at least 2 characters')
		.max(100, 'Display name cannot exceed 100 characters'),

	email: z
		.string()
		.trim()
		.toLowerCase()
		.email('Invalid email address')
		.max(254, 'Email address is too long'),

	password: z
		.string()
		.min(15, 'Password must contain at least 15 characters')
		.max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
	email: z.string().trim().toLowerCase().email(),

	password: z.string().min(1).max(128),
});

export const emailVerificationSchema = z.object({
	token: z
		.string()
		.trim()
		.regex(/^[a-f0-9]{64}$/i, 'Invalid verification token'),
});