import createSessionMiddleware from '#server/middleware/sessionMiddleware';
import createDeletedAccountCleanupRepository from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupRepository';
import createDeletedAccountCleanupWorker from '#server/modules/account/deletedAccountCleanup/deletedAccountCleanupWorker';
import createAuthEventOutboxRepository from '#server/modules/auth/shared/events/authEventOutboxRepository';
import createAuthEventOutboxWorker from '#server/modules/auth/shared/events/authEventOutboxWorker';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';
import requireAuth from '#server/modules/auth/shared/middleware/requireAuth';
import createMySqlRateLimitStore from '#server/modules/auth/shared/middleware/mySqlRateLimitStore';

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

	return Object.freeze({
		authenticated: requireAuth(db),
		authEventService,
		createRateLimitStore: (namespace) => createMySqlRateLimitStore(db, namespace),
		framework: Object.freeze({}),
		session,
		workers: Object.freeze([authEventOutboxWorker, deletedAccountCleanupWorker]),
	});
}
