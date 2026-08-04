import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email('Invalid email address').max(254, 'Email address is too long');

const passwordSchema = z.string().min(15, 'Password must contain at least 15 characters').max(128, 'Password cannot exceed 128 characters');

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

	rememberMe: z.boolean().optional().default(false),
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

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required').max(128, 'Current password is too long'),

		newPassword: passwordSchema,

		confirmPassword: z.string().min(1, 'Password confirmation is required').max(128, 'Password confirmation is too long'),
	})
	.superRefine((data, context) => {
		if (data.newPassword !== data.confirmPassword) {
			context.addIssue({
				code: 'custom',
				path: ['confirmPassword'],
				message: 'Password confirmation does not match',
			});
		}

		if (data.currentPassword === data.newPassword) {
			context.addIssue({
				code: 'custom',
				path: ['newPassword'],
				message: 'New password must be different from the current password',
			});
		}
	});

export const totpCodeSchema = z.object({
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, 'Invalid authentication code'),
});

export const totpLoginSchema = z.object({
	code: z.string().trim().min(1, 'Authentication code is required').max(32, 'Authentication code is too long'),
});

export const disableTotpSchema = z.object({
	password: z.string().min(1, 'Current password is required').max(128, 'Password is too long'),

	code: z.string().trim().min(1, 'Authentication code is required').max(32, 'Authentication code is too long'),
});
