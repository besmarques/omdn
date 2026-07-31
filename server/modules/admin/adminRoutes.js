import express from 'express';

import requirePermission from '#server/modules/auth/shared/middleware/requirePermission';

export default function createAdminRoutes({ testAdminAccessController }) {
	const router = express.Router();

	router.get('/test', requirePermission('users.manage'), testAdminAccessController);

	return router;
}
