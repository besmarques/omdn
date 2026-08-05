import express from 'express';

import requirePermission from '#server/modules/auth/shared/middleware/requirePermission';

export default function createAdminRoutes({ articleController, recipeController, testAdminAccessController }) {
	const router = express.Router();

	router.get('/test', requirePermission('users.manage'), testAdminAccessController);
	router.post('/recipes', requirePermission('posts.create'), recipeController);
	router.post('/articles', requirePermission('posts.create'), articleController);

	return router;
}
