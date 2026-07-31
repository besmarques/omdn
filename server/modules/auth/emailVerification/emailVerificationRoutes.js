import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

import { createEmailResendRateLimiter } from '#server/modules/auth/shared/middleware/authRateLimiters';

export default function createEmailVerificationRoutes({ resendVerificationEmailController, verifyEmailController }) {
	const router = express.Router();

	const emailResendRateLimiter = createEmailResendRateLimiter();

	router.post('/email/verify', verifyEmailController);

	router.post('/email/resend', requireGuest, emailResendRateLimiter, resendVerificationEmailController);

	return router;
}
