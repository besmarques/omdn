function closeHttpServer(server) {
	return new Promise((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});

		server.closeIdleConnections?.();
	});
}

export default function createGracefulShutdown({
	server,
	authEventService,
	workerLifecycle,
	sessionStore,
	db,
	timeoutMs = 8000,
	logger = console,
	forceExit = process.exit,
}) {
	let shutdownOperation;

	return function shutdown(signal) {
		if (shutdownOperation) {
			return shutdownOperation;
		}

		shutdownOperation = (async () => {
			logger.log(`Received ${signal}; shutting down`);

			const deadline = setTimeout(() => {
				logger.error(`Graceful shutdown exceeded ${timeoutMs}ms; forcing exit`);
				server.closeAllConnections?.();
				forceExit(1);
			}, timeoutMs);

			try {
				await closeHttpServer(server);
				await authEventService.drain();
				await workerLifecycle.stop();
				await sessionStore.close();
				await db.end();

				logger.log('Shutdown complete');
			} finally {
				clearTimeout(deadline);
			}
		})();

		return shutdownOperation;
	};
}
