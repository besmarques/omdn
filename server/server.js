import process from 'node:process';

import loadServerConfig from '#server/config/serverConfig';
import createApp from '#server/expressApp';
import createPool from '#server/dbConnect/createPool';

const config = loadServerConfig(process.env);
const db = createPool(config.database);
const app = createApp(db, config);

app.locals.authEventOutboxWorker.start();
app.locals.deletedAccountCleanupWorker.start();

const server = app.listen(config.port, () => {
	console.log(`OMDN running on port ${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
	if (shuttingDown) {
		return;
	}

	shuttingDown = true;

	console.log(`Received ${signal}; shutting down`);

	await new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});

	await app.locals.authEventService.drain();
	await app.locals.authEventOutboxWorker.stop();
	await app.locals.deletedAccountCleanupWorker.stop();
	await db.end();
}

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, () => {
		void shutdown(signal).catch((error) => {
			console.error('Graceful shutdown failed', error);
			process.exitCode = 1;
		});
	});
}
