import express from 'express';

import requireGuest from '#server/modules/auth/middleware/requireGuest';

export default function createAuthRoutes({
	loginController,
	registerController,
	resendVerificationEmailController,
	verifyEmailController,
}) {
	const router = express.Router();

	router.get('/status', (req, res) => {
		return res.json({
			status: true,
			authenticated: Boolean(req.session?.userId),
		});
	});

	router.get('/guest-test', requireGuest, (req, res) => {
		return res.json({
			status: true,
			message: 'This route is available only to guests',
		});
	});

	router.post(
		'/register',
		requireGuest,
		registerController,
	);

	router.post(
		'/email/verify',
		verifyEmailController,
	);

	router.post(
		'/email/resend',
		requireGuest,
		resendVerificationEmailController,
	);

	router.post(
		'/login',
		requireGuest,
		loginController,
	);

	return router;
}