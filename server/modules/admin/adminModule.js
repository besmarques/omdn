import createAdminRoutes from '#server/modules/admin/adminRoutes';
import createTestAdminAccessController from '#server/modules/admin/testAccess/testAdminAccessController';
import createTestAdminAccessService from '#server/modules/admin/testAccess/testAdminAccessService';
import createRecipeController from '#server/modules/admin/recipes/createRecipeController';
import createRecipeRepository from '#server/modules/admin/recipes/createRecipeRepository';
import createRecipeService from '#server/modules/admin/recipes/createRecipeService';
import createArticleController from '#server/modules/admin/articles/createArticleController';
import createArticleRepository from '#server/modules/admin/articles/createArticleRepository';
import createArticleService from '#server/modules/admin/articles/createArticleService';

export default function createAdminModule(db) {
	const testAdminAccessService = createTestAdminAccessService();

	const testAdminAccessController = createTestAdminAccessController(testAdminAccessService);
	const recipeController = createRecipeController(createRecipeService(createRecipeRepository(db)));
	const articleController = createArticleController(createArticleService(createArticleRepository(db)));

	return createAdminRoutes({
		articleController,
		recipeController,
		testAdminAccessController,
	});
}
