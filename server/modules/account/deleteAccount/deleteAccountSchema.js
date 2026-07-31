import { z } from 'zod';

export const deleteAccountSchema = z.object({
	password: z.string().min(1, 'Current password is required').max(128, 'Password is too long'),

	code: z.string().trim().min(1, 'Authentication code is required').max(32, 'Authentication code is too long').optional(),
});
