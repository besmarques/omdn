import { afterEach, describe, expect, it, vi } from 'vitest';

import createGracefulShutdown from '#server/shutdown';

function createDependencies({ closeServer = true } = {}) {
	let closeCallback;
	const server = {
		close: vi.fn((callback) => {
			closeCallback = callback;

			if (closeServer) {
				callback();
			}
		}),
		closeAllConnections: vi.fn(() => {
			closeCallback?.();
		}),
		closeIdleConnections: vi.fn(),
	};
	const authEventService = {
		drain: vi.fn().mockResolvedValue(),
	};
	const workerLifecycle = {
		stop: vi.fn().mockResolvedValue(),
	};
	const sessionStore = {
		close: vi.fn().mockResolvedValue(),
	};
	const db = {
		end: vi.fn().mockResolvedValue(),
	};
	const logger = {
		error: vi.fn(),
		log: vi.fn(),
	};
	const forceExit = vi.fn();

	return {
		server,
		authEventService,
		workerLifecycle,
		sessionStore,
		db,
		logger,
		forceExit,
	};
}

afterEach(() => {
	vi.useRealTimers();
});

describe('graceful shutdown', () => {
	it('closes HTTP, drains work, stops workers, and closes the database', async () => {
		const dependencies = createDependencies();
		const shutdown = createGracefulShutdown(dependencies);

		await shutdown('SIGTERM');

		expect(dependencies.server.close).toHaveBeenCalledOnce();
		expect(dependencies.server.closeIdleConnections).toHaveBeenCalledOnce();
		expect(dependencies.authEventService.drain).toHaveBeenCalledOnce();
		expect(dependencies.workerLifecycle.stop).toHaveBeenCalledOnce();
		expect(dependencies.sessionStore.close).toHaveBeenCalledOnce();
		expect(dependencies.db.end).toHaveBeenCalledOnce();
		expect(dependencies.forceExit).not.toHaveBeenCalled();
		expect(dependencies.logger.log).toHaveBeenLastCalledWith('Shutdown complete');
	});

	it('returns the same operation when shutdown is requested repeatedly', async () => {
		const dependencies = createDependencies();
		const shutdown = createGracefulShutdown(dependencies);

		const firstOperation = shutdown('SIGTERM');
		const secondOperation = shutdown('SIGINT');

		expect(secondOperation).toBe(firstOperation);

		await firstOperation;

		expect(dependencies.server.close).toHaveBeenCalledOnce();
	});

	it('force-closes connections and exits when the deadline expires', async () => {
		vi.useFakeTimers();

		const dependencies = createDependencies({
			closeServer: false,
		});
		const shutdown = createGracefulShutdown({
			...dependencies,
			timeoutMs: 100,
		});
		const shutdownOperation = shutdown('SIGTERM');

		await vi.advanceTimersByTimeAsync(100);

		expect(dependencies.server.closeAllConnections).toHaveBeenCalledOnce();
		expect(dependencies.forceExit).toHaveBeenCalledWith(1);
		expect(dependencies.logger.error).toHaveBeenCalledWith('Graceful shutdown exceeded 100ms; forcing exit');

		await shutdownOperation;
	});
});
