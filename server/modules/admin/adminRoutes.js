import express from 'express';
import multer from 'multer';

import requirePermission from '#server/modules/auth/shared/middleware/requirePermission';

export default function createAdminRoutes({
	articleController,
	contentTypeController,
	editPostController,
	postLifecycleController,
	mediaController,
	recipeController,
	testAdminAccessController,
}) {
	const router = express.Router();
	const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

	router.get('/test', requirePermission('users.manage'), testAdminAccessController);
	router.post('/recipes', requirePermission('posts.create'), recipeController);
	router.post('/articles', requirePermission('posts.create'), articleController);
	router.get('/media', mediaController.list);
	router.post('/media', upload.single('image'), mediaController.upload);
	router.get('/media/settings', mediaController.settings);
	router.put('/media/settings', mediaController.updateSettings);
	router.get('/media/:id/files/:variant', mediaController.file);
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
