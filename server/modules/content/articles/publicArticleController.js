import createPublicPostController from '../recipes/publicRecipeController.js';

export default function createPublicArticleController(publicArticles) {
	return createPublicPostController(publicArticles, { basePath: '/api/articles', itemName: 'Article', resultKey: 'article' });
}
