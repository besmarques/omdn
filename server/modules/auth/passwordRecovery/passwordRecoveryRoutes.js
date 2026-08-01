import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

import { createForgotPasswordRateLimiter } from '#server/modules/auth/shared/middleware/authRateLimiters';

export default function createPasswordRecoveryRoutes({ createRateLimitStore, forgotPasswordController, resetPasswordController }) {
	const router = express.Router();

	const forgotPasswordRateLimiter = createForgotPasswordRateLimiter(createRateLimitStore);

	router.post('/password/forgot', requireGuest, forgotPasswordRateLimiter, forgotPasswordController);

	router.post('/password/reset', requireGuest, resetPasswordController);

	return router;
}
