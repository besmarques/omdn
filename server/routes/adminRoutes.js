import express from 'express';

import requirePermission from '#server/modules/auth/middleware/requirePermission';

export default function createAdminRoutes() {
	const router = express.Router();

	router.get(
		'/test',
		requirePermission('users.manage'),
		(req, res) => {
			res.json({
				status: true,
				message: 'You have access to this admin route',
			});
		},
	);

	return router;
}