import createContentRoutes from '#server/modules/content/contentRoutes';

export default function createContentModule({ publicRecipes }) {
	return createContentRoutes({ publicRecipes });
}
