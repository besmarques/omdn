import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

export default function createAuthRoutes() {
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

	return router;
}