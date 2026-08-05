import express from 'express';

import createFrontendHandlers from '#server/frontend/createFrontendHandlers';
import createFrameworkRequestContext from '#server/framework/createFrameworkRequestContext';
import { apiErrorHandler, requestContext } from '#server/middleware/apiErrorMiddleware';
import { requireCsrfProtection } from '#server/middleware/csrfMiddleware';
import createSecurityHeaders from '#server/middleware/securityHeaders';

import createAccountModule from '#server/modules/account/accountModule';
import createAdminModule from '#server/modules/admin/adminModule';
import createAuthModule from '#server/modules/auth/authModule';
import createContentModule from '#server/modules/content/contentModule';

import createApiRoutes from '#server/routes/apiRoutes';

export default function createApp(db, config, services, { frontend: providedFrontend } = {}) {
	const app = express();
	const { authenticated, authEventService, createRateLimitStore, mail, resolvePrincipal, session } = services;
	const frontend =
		providedFrontend ??
		createFrontendHandlers(config, {
			getLoadContext: createFrameworkRequestContext({ services: services.framework }),
		});

	if (config.appEnvironment === 'production') {
		app.set('trust proxy', 1);
	}

	app.use(requestContext);
	app.use(createSecurityHeaders({ production: config.appEnvironment === 'production' }));

	if (frontend.assets) {
		app.use('/assets', frontend.assets);
	}

	if (frontend.publicFiles) {
		app.use(frontend.publicFiles);
	}

	app.locals.applicationServices = services;
	app.use('/api', express.json());
	app.use('/api', session.middleware);
	app.use('/api', requireCsrfProtection);

	app.use('/api/auth', createAuthModule(db, createRateLimitStore, authEventService, config, mail));

	app.use('/api/admin', authenticated, createAdminModule(db, config));

	app.use('/api/account', authenticated, createAccountModule(db, createRateLimitStore, authEventService, config));

	app.use('/api', createContentModule({ publicArticles: services.publicArticles, publicRecipes: services.publicRecipes }));

	// Generic API routes and API 404 handling
	// must stay last.
	app.use('/api', createApiRoutes(db));

	if (frontend.requestHandler) {
		app.use(
			/^\/(?:admin(?:$|\/.*|\.data$)|account\/security(?:$|\.data$))/u,
			(_req, res, next) => {
				res.set('Cache-Control', 'private, no-store');
				return next();
			},
			session.middleware,
			resolvePrincipal,
		);
		app.use(/^\/(?:login|register|verify-email)(?:$|\.data$)/u, session.middleware, resolvePrincipal);
		app.all('/{*splat}', frontend.requestHandler);
	}

	app.use('/api', apiErrorHandler);

	return app;
}
