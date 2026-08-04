import process from 'node:process';

import { createRequestHandler } from '@react-router/express';
import { createServer as createViteServer } from 'vite';

import createApplication from '#server/application/createApplication';
import loadServerConfig from '#server/config/serverConfig';
import createFrameworkRequestContext from '#server/framework/createFrameworkRequestContext';
import createGracefulShutdown from '#server/shutdown';

const config = loadServerConfig(process.env);

if (config.appEnvironment !== 'development') {
	throw new Error('The Vite middleware server can run only with APP_ENV=development');
}

process.env.OMDN_COMBINED_DEV = 'true';

const vite = await createViteServer({
	appType: 'custom',
	server: {
		middlewareMode: true,
	},
});

const { app, db, services, workerLifecycle } = createApplication(config, {
	createFrontend: ({ services: frameworkServices }) => ({
		publicFiles: vite.middlewares,
		requestHandler: createRequestHandler({
			build: () => vite.ssrLoadModule('virtual:react-router/server-build'),
			getLoadContext: createFrameworkRequestContext({ services: frameworkServices.framework }),
			mode: config.appEnvironment,
		}),
	}),
});

workerLifecycle.start();

const server = app.listen(config.port, () => {
	console.log(`OMDN development server running on http://127.0.0.1:${config.port}`);
});

const shutdownApplication = createGracefulShutdown({
	server,
	authEventService: services.authEventService,
	workerLifecycle,
	sessionStore: services.session.store,
	db,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, () => {
		void vite
			.close()
			.then(() => shutdownApplication(signal))
			.catch((error) => {
				console.error('Graceful development shutdown failed', error);
				process.exitCode = 1;
			});
	});
}
