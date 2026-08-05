import createAdminRoutes from '#server/modules/admin/adminRoutes';
import createTestAdminAccessController from '#server/modules/admin/testAccess/testAdminAccessController';
import createTestAdminAccessService from '#server/modules/admin/testAccess/testAdminAccessService';
import createRecipeController from '#server/modules/admin/recipes/createRecipeController';
import createRecipeRepository from '#server/modules/admin/recipes/createRecipeRepository';
import createRecipeService from '#server/modules/admin/recipes/createRecipeService';
import createArticleController from '#server/modules/admin/articles/createArticleController';
import createArticleRepository from '#server/modules/admin/articles/createArticleRepository';
import createArticleService from '#server/modules/admin/articles/createArticleService';
import createAdminContentTypeController from '#server/modules/admin/contentTypes/adminContentTypeController';
import createAdminContentTypeRepository from '#server/modules/admin/contentTypes/adminContentTypeRepository';
import createEditPostController from '#server/modules/admin/posts/editPostController';
import createEditPostRepository from '#server/modules/admin/posts/editPostRepository';

export default function createAdminModule(db) {
	const testAdminAccessService = createTestAdminAccessService();

	const testAdminAccessController = createTestAdminAccessController(testAdminAccessService);
	const recipeController = createRecipeController(createRecipeService(createRecipeRepository(db)));
	const articleController = createArticleController(createArticleService(createArticleRepository(db)));
	const contentTypeController = createAdminContentTypeController(createAdminContentTypeRepository(db));
	const editPostController = createEditPostController(createEditPostRepository(db), {
		article: createArticleService(async (record) => record),
		recipe: createRecipeService(async (record) => record),
	});

	return createAdminRoutes({
		articleController,
		contentTypeController,
		editPostController,
		recipeController,
		testAdminAccessController,
	});
}
