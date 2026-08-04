import process from 'node:process';

import createApplication from '#server/application/createApplication';
import loadServerConfig from '#server/config/serverConfig';
import createGracefulShutdown from '#server/shutdown';

const config = loadServerConfig(process.env);
const { app, db, services, workerLifecycle } = createApplication(config);

workerLifecycle.start();

const server = app.listen(config.port, () => {
	console.log(`OMDN running on port ${config.port}`);
});

const shutdown = createGracefulShutdown({
	server,
	authEventService: services.authEventService,
	workerLifecycle,
	sessionStore: services.session.store,
	db,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, () => {
		void shutdown(signal).catch((error) => {
			console.error('Graceful shutdown failed', error);
			process.exitCode = 1;
		});
	});
}
