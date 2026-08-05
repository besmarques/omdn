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
import createPostLifecycleController from '#server/modules/admin/posts/postLifecycleController';
import createPostLifecycleRepository from '#server/modules/admin/posts/postLifecycleRepository';
import createLocalMediaStorage from '#server/modules/media/localMediaStorage';
import createMediaController from '#server/modules/media/mediaController';
import createMediaRepository from '#server/modules/media/mediaRepository';
import createMediaService from '#server/modules/media/mediaService';

export default function createAdminModule(db, config) {
	const testAdminAccessService = createTestAdminAccessService();

	const testAdminAccessController = createTestAdminAccessController(testAdminAccessService);
	const recipeController = createRecipeController(createRecipeService(createRecipeRepository(db)));
	const articleController = createArticleController(createArticleService(createArticleRepository(db)));
	const contentTypeController = createAdminContentTypeController(createAdminContentTypeRepository(db));
	const editPostRepository = createEditPostRepository(db);
	const editPostController = createEditPostController(editPostRepository, {
		article: createArticleService(async (record) => record),
		recipe: createRecipeService(async (record) => record),
	});
	const postLifecycleController = createPostLifecycleController(editPostRepository, createPostLifecycleRepository(db));
	const mediaRepository = createMediaRepository(db);
	const mediaStorage = createLocalMediaStorage(config?.mediaStoragePath ?? 'storage/media');
	const mediaController = createMediaController(mediaRepository, createMediaService(mediaRepository, mediaStorage), mediaStorage);

	return createAdminRoutes({
		articleController,
		contentTypeController,
		editPostController,
		postLifecycleController,
		mediaController,
		recipeController,
		testAdminAccessController,
	});
}
