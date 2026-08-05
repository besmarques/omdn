import express from 'express';

import requirePermission from '#server/modules/auth/shared/middleware/requirePermission';

export default function createAdminRoutes({
	articleController,
	contentTypeController,
	editPostController,
	postLifecycleController,
	recipeController,
	testAdminAccessController,
}) {
	const router = express.Router();

	router.get('/test', requirePermission('users.manage'), testAdminAccessController);
	router.post('/recipes', requirePermission('posts.create'), recipeController);
	router.post('/articles', requirePermission('posts.create'), articleController);
	router.get('/content-types/:contentType', contentTypeController.get);
	router.post('/content-types/:contentType/categories', contentTypeController.createCategory);
	router.post('/content-types/:contentType/tags', contentTypeController.createTag);
	router.get('/content-types/:contentType/posts/:id', editPostController.get);
	router.put('/content-types/:contentType/posts/:id', editPostController.update);
	router.post('/content-types/:contentType/posts/:id/actions/:action', postLifecycleController);
	router.put('/content-types/:contentType/:taxonomy/:id', contentTypeController.updateTaxonomy);
	router.delete('/content-types/:contentType/:taxonomy/:id', contentTypeController.deleteTaxonomy);
	router.patch('/content-types/:contentType/archive-seo', contentTypeController.updateArchiveSeo);

	return router;
}
