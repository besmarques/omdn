import express from 'express';

import requireGuest from '#server/modules/auth/middleware/requireGuest';

export default function createPasswordRecoveryRoutes({
	forgotPasswordController,
	resetPasswordController,
}) {
	const router = express.Router();

	router.post(
		'/password/forgot',
		requireGuest,
		forgotPasswordController,
	);

	router.post(
		'/password/reset',
		requireGuest,
		resetPasswordController,
	);

	return router;
}