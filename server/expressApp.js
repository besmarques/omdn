import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { apiErrorHandler, apiRequestContext } from '#server/middleware/apiErrorMiddleware';
import { requireCsrfProtection } from '#server/middleware/csrfMiddleware';

import createAccountModule from '#server/modules/account/accountModule';
import createAdminModule from '#server/modules/admin/adminModule';
import createAuthModule from '#server/modules/auth/authModule';

import createApiRoutes from '#server/routes/apiRoutes';

export default function createApp(db, config, services) {
	const app = express();
	const { authenticated, authEventService, createRateLimitStore, session } = services;

	app.use('/api', apiRequestContext);

	app.use(express.json());

	if (config.appEnvironment === 'production') {
		app.set('trust proxy', 1);
	}

	app.locals.applicationServices = services;
	app.use(session.middleware);
	app.use('/api', requireCsrfProtection);

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

		const clientBuildPath = path.resolve(__dirname, '../build/client');

		app.use(
			'/assets',
			express.static(path.join(clientBuildPath, 'assets'), {
				immutable: true,
				maxAge: '1y',
			}),
		);
		app.use(express.static(clientBuildPath));

		app.get('/{*splat}', (req, res) => {
			res.sendFile(path.join(clientBuildPath, 'index.html'));
		});
	}

	return app;
}
