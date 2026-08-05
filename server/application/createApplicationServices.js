import createSessionMiddleware from '#server/middleware/sessionMiddleware';
import createDeletedAccountCleanupRepository from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupRepository';
import createDeletedAccountCleanupWorker from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupWorker';
import createAuthEventOutboxRepository from '#server/modules/auth/shared/events/authEventOutboxRepository';
import createAuthEventOutboxWorker from '#server/modules/auth/shared/events/authEventOutboxWorker';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';
import requireAuth from '#server/modules/auth/shared/middleware/requireAuth';
import resolvePrincipal from '#server/modules/auth/shared/middleware/resolvePrincipal';
import createMySqlRateLimitStore from '#server/modules/auth/shared/middleware/mySqlRateLimitStore';
import createMailService from '#server/mail/createMailService';
import createPublicRecipeRepository from '#server/modules/content/recipes/publicRecipeRepository';
import createPublicRecipeService from '#server/modules/content/recipes/publicRecipeService';
import createPublicArticleRepository from '#server/modules/content/articles/publicArticleRepository';
import createPublicArticleService from '#server/modules/content/articles/publicArticleService';
import createPublicationScheduleRepository from '#server/modules/content/publication/publicationScheduleRepository';
import createPublicationScheduleWorker from '#server/modules/content/publication/publicationScheduleWorker';
import createContentTypeSettingsRepository from '#server/modules/content/contentTypeSettingsRepository';

export default function createApplicationServices(db, config) {
	const session = createSessionMiddleware(db, config.session);
	const authEventRepository = createAuthEventRepository(db);
	const authEventOutboxRepository = createAuthEventOutboxRepository(db);
	const authEventService = createAuthEventService(authEventOutboxRepository);
	const authEventOutboxWorker = createAuthEventOutboxWorker({
		authEventRepository,
		outboxRepository: authEventOutboxRepository,
	});
	const deletedAccountCleanupRepository = createDeletedAccountCleanupRepository(db);
	const deletedAccountCleanupWorker = createDeletedAccountCleanupWorker({
		repository: deletedAccountCleanupRepository,
	});
	const mail = createMailService(config);
	const publicRecipes = createPublicRecipeService(createPublicRecipeRepository(db));
	const publicArticles = createPublicArticleService(createPublicArticleRepository(db));
	const contentTypeSettings = createContentTypeSettingsRepository(db);
	const publicationScheduleWorker = createPublicationScheduleWorker({ repository: createPublicationScheduleRepository(db) });
	const framework = Object.freeze({
		publicBaseUrl: config.publicBaseUrl,
		publicArticles,
		contentTypeSettings,
		publicRecipes,
	});

	return Object.freeze({
		authenticated: requireAuth(db),
		authEventService,
		createRateLimitStore: (namespace) => createMySqlRateLimitStore(db, namespace),
		framework,
		mail,
		publicArticles,
		publicRecipes,
		resolvePrincipal: resolvePrincipal(db),
		session,
		workers: Object.freeze([authEventOutboxWorker, deletedAccountCleanupWorker, publicationScheduleWorker]),
	});
}
