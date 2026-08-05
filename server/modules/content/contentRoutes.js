import express from 'express';

import createPublicRecipeController from '#server/modules/content/recipes/publicRecipeController';
import createPublicArticleController from '#server/modules/content/articles/publicArticleController';

export default function createContentRoutes({ publicArticles, publicRecipes }) {
	const router = express.Router();
	const controller = createPublicRecipeController(publicRecipes);
	const articleController = createPublicArticleController(publicArticles);

	router.get('/articles', articleController.list);
	router.get('/articles/archive', articleController.archive);
	router.get('/articles/:slug', articleController.getBySlug);

	router.get('/recipes', controller.list);
	router.get('/recipes/archive', controller.archive);
	router.get('/recipes/:slug', controller.getBySlug);

	return router;
}
