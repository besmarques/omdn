import express from 'express';

import requireGuest from '#server/middleware/auth/requireGuest';

export default function createAuthRoutes() {
	const router = express.Router();

	router.get('/status', (req, res) => {
		res.json({
			status: true,
			authenticated: Boolean(req.session?.userId),
		});
	});

	router.get('/guest-test', requireGuest, (req, res) => {
		res.json({
			status: true,
			message: 'This route is available only to guests',
		});
	});

	return router;
}