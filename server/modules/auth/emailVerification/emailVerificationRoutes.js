import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

export default function createEmailVerificationRoutes({
	resendVerificationEmailController,
	verifyEmailController,
}) {
	const router = express.Router();

	router.post(
		'/email/verify',
		verifyEmailController,
	);

	router.post(
		'/email/resend',
		requireGuest,
		resendVerificationEmailController,
	);

	return router;
}