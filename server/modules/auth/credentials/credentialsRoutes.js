import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

import { createLoginRateLimiter } from '#server/modules/auth/shared/middleware/authRateLimiters';

export default function createCredentialsRoutes({ loginController, logoutController }) {
	const router = express.Router();

	const loginRateLimiter = createLoginRateLimiter();

	router.post('/login', requireGuest, loginRateLimiter, loginController);

	router.post('/logout', logoutController);

	return router;
}
