import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { apiErrorHandler, apiRequestContext } from '#server/middleware/apiErrorMiddleware';
import createSessionMiddleware from '#server/middleware/sessionMiddleware';

import createAccountModule from '#server/modules/account/accountModule';
import createAdminModule from '#server/modules/admin/adminModule';
import createAuthModule from '#server/modules/auth/authModule';

import createAuthEventOutboxRepository from '#server/modules/auth/shared/events/authEventOutboxRepository';
import createAuthEventOutboxWorker from '#server/modules/auth/shared/events/authEventOutboxWorker';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';

import requireAuth from '#server/modules/auth/shared/middleware/requireAuth';
import createMySqlRateLimitStore from '#server/modules/auth/shared/middleware/mySqlRateLimitStore';

import createApiRoutes from '#server/routes/apiRoutes';

export default function createApp(db, config) {
	const app = express();

	app.use('/api', apiRequestContext);

	app.use(express.json());

	if (config.appEnvironment === 'production') {
		app.set('trust proxy', 1);
	}

	app.use(createSessionMiddleware(db, config.session));

	const authenticated = requireAuth(db);
	const createRateLimitStore = (namespace) => createMySqlRateLimitStore(db, namespace);
	const authEventRepository = createAuthEventRepository(db);
	const authEventOutboxRepository = createAuthEventOutboxRepository(db);
	const authEventService = createAuthEventService(authEventOutboxRepository);
	const authEventOutboxWorker = createAuthEventOutboxWorker({
		authEventRepository,
		outboxRepository: authEventOutboxRepository,
	});

	app.locals.authEventOutboxWorker = authEventOutboxWorker;
	app.locals.authEventService = authEventService;

	app.use('/api/auth', createAuthModule(db, createRateLimitStore, authEventService, config));

	app.use('/api/admin', authenticated, createAdminModule());

	app.use('/api/account', authenticated, createAccountModule(db, createRateLimitStore, authEventService, config));

	// Generic API routes and API 404 handling
	// must stay last.
	app.use('/api', createApiRoutes(db));

	app.use('/api', apiErrorHandler);

	if (config.appEnvironment === 'production') {
		const __filename = fileURLToPath(import.meta.url);

		const __dirname = path.dirname(__filename);

		const distPath = path.resolve(__dirname, '../dist');

		app.use(express.static(distPath));

		app.get('/{*splat}', (req, res) => {
			res.sendFile(path.join(distPath, 'index.html'));
		});
	}

	return app;
}
