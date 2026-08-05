import express from 'express';

import requirePermission from '#server/modules/auth/shared/middleware/requirePermission';

export default function createAdminRoutes({ articleController, contentTypeController, recipeController, testAdminAccessController }) {
	const router = express.Router();

	router.get('/test', requirePermission('users.manage'), testAdminAccessController);
	router.post('/recipes', requirePermission('posts.create'), recipeController);
	router.post('/articles', requirePermission('posts.create'), articleController);
	router.get('/content-types/:contentType', contentTypeController.get);
	router.post('/content-types/:contentType/categories', contentTypeController.createCategory);
	router.patch('/content-types/:contentType/archive-seo', contentTypeController.updateArchiveSeo);

	return router;
}
