import process from 'node:process';

import loadServerConfig from '#server/config/serverConfig';
import createApp from '#server/expressApp';
import createPool from '#server/dbConnect/createPool';
import createGracefulShutdown from '#server/shutdown';

const config = loadServerConfig(process.env);
const db = createPool(config.database);
const app = createApp(db, config);

app.locals.authEventOutboxWorker.start();
app.locals.deletedAccountCleanupWorker.start();

const server = app.listen(config.port, () => {
	console.log(`OMDN running on port ${config.port}`);
});

const shutdown = createGracefulShutdown({
	server,
	authEventService: app.locals.authEventService,
	authEventOutboxWorker: app.locals.authEventOutboxWorker,
	deletedAccountCleanupWorker: app.locals.deletedAccountCleanupWorker,
	sessionStore: app.locals.sessionStore,
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
