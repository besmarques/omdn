import express from 'express';

import requireGuest from '#server/modules/auth/middleware/requireGuest';

export default function createCredentialsRoutes({
	loginController,
	logoutController,
}) {
	const router = express.Router();

	router.post(
		'/login',
		requireGuest,
		loginController,
	);

	router.post(
		'/logout',
		logoutController,
	);

	return router;
}