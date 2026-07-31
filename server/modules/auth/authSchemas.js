import { z } from 'zod';

const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.email('Invalid email address')
	.max(254, 'Email address is too long');

const passwordSchema = z
	.string()
	.min(15, 'Password must contain at least 15 characters')
	.max(128, 'Password cannot exceed 128 characters');

const tokenSchema = z
	.string()
	.trim()
	.regex(/^[a-f0-9]{64}$/i, 'Invalid token');

export const registerSchema = z.object({
	displayName: z
		.string()
		.trim()
		.min(2, 'Display name must contain at least 2 characters')
		.max(100, 'Display name cannot exceed 100 characters'),

	email: emailSchema,

	password: passwordSchema,
});

export const loginSchema = z.object({
	email: emailSchema,

	password: z.string().min(1).max(128),
});

export const emailVerificationSchema = z.object({
	token: tokenSchema,
});

export const forgotPasswordSchema = z.object({
	email: emailSchema,
});

export const resetPasswordSchema = z.object({
	token: tokenSchema,

	password: passwordSchema,
});