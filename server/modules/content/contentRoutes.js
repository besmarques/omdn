import express from 'express';

import createPublicRecipeController from '#server/modules/content/recipes/publicRecipeController';

export default function createContentRoutes({ publicRecipes }) {
	const router = express.Router();
	const controller = createPublicRecipeController(publicRecipes);

	router.get('/recipes', controller.list);
	router.get('/recipes/archive', controller.archive);
	router.get('/recipes/:slug', controller.getBySlug);

	return router;
}
