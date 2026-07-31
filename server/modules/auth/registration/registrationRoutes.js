import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

export default function createRegistrationRoutes({ registerController }) {
	const router = express.Router();

	router.post('/register', requireGuest, registerController);

	return router;
}
