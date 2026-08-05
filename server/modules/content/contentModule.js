import createContentRoutes from '#server/modules/content/contentRoutes';

export default function createContentModule({ publicArticles, publicRecipes }) {
	return createContentRoutes({ publicArticles, publicRecipes });
}
