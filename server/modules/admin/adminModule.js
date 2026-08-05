import createAdminRoutes from '#server/modules/admin/adminRoutes';
import createTestAdminAccessController from '#server/modules/admin/testAccess/testAdminAccessController';
import createTestAdminAccessService from '#server/modules/admin/testAccess/testAdminAccessService';
import createRecipeController from '#server/modules/admin/recipes/createRecipeController';
import createRecipeRepository from '#server/modules/admin/recipes/createRecipeRepository';
import createRecipeService from '#server/modules/admin/recipes/createRecipeService';

export default function createAdminModule(db) {
	const testAdminAccessService = createTestAdminAccessService();

	const testAdminAccessController = createTestAdminAccessController(testAdminAccessService);
	const recipeController = createRecipeController(createRecipeService(createRecipeRepository(db)));

	return createAdminRoutes({
		recipeController,
		testAdminAccessController,
	});
}
