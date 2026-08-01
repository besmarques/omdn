import express from 'express';

import { createRegistrationRateLimiter } from '#server/modules/auth/shared/middleware/authRateLimiters';
import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

export default function createRegistrationRoutes({ createRateLimitStore, registerController }) {
	const router = express.Router();
	const registrationRateLimiter = createRegistrationRateLimiter(createRateLimitStore);

	router.post('/register', requireGuest, registrationRateLimiter, registerController);

	return router;
}
