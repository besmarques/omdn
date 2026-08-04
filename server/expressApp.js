import express from 'express';

import createFrontendHandlers from '#server/frontend/createFrontendHandlers';
import { apiErrorHandler, apiRequestContext } from '#server/middleware/apiErrorMiddleware';
import { requireCsrfProtection } from '#server/middleware/csrfMiddleware';
import createSecurityHeaders from '#server/middleware/securityHeaders';

import createAccountModule from '#server/modules/account/accountModule';
import createAdminModule from '#server/modules/admin/adminModule';
import createAuthModule from '#server/modules/auth/authModule';

import createApiRoutes from '#server/routes/apiRoutes';

export default function createApp(db, config, services, { frontend = createFrontendHandlers(config) } = {}) {
	const app = express();
	const { authenticated, authEventService, createRateLimitStore, session } = services;

	if (config.appEnvironment === 'production') {
		app.set('trust proxy', 1);
	}

	app.use('/api', apiRequestContext);
	app.use(createSecurityHeaders({ production: config.appEnvironment === 'production' }));

	if (frontend.assets) {
		app.use('/assets', frontend.assets);
		app.use(frontend.publicFiles);
	}

	app.locals.applicationServices = services;
	app.use('/api', express.json());
	app.use('/api', session.middleware);
	app.use('/api', requireCsrfProtection);

	app.use('/api/auth', createAuthModule(db, createRateLimitStore, authEventService, config));

	app.use('/api/admin', authenticated, createAdminModule());

	app.use('/api/account', authenticated, createAccountModule(db, createRateLimitStore, authEventService, config));

	// Generic API routes and API 404 handling
	// must stay last.
	app.use('/api', createApiRoutes(db));

	if (frontend.requestHandler) {
		app.get('/{*splat}', (req, res) => {
			frontend.requestHandler(req, res);
		});
	}

	app.use('/api', apiErrorHandler);

	return app;
}
