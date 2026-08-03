import { setTimeout as delay } from 'node:timers/promises';

export default function createDeletedAccountCleanupWorker({ repository, batchSize = 100, pollIntervalMs = 24 * 60 * 60 * 1000 }) {
	let abortController;
	let loopPromise;
	let running = false;

	async function processNext() {
		return repository.purgeExpiredDeletedUsers(batchSize);
	}

	async function waitForNextRun() {
		await delay(pollIntervalMs, undefined, {
			signal: abortController.signal,
		});
	}

	async function run() {
		while (running) {
			try {
				let purgedUsers;

				do {
					purgedUsers = await processNext();

					if (purgedUsers > 0) {
						console.log(`Permanently deleted ${purgedUsers} expired soft-deleted users`);
					}
				} while (running && purgedUsers === batchSize);

				if (running) {
					await waitForNextRun();
				}
			} catch (error) {
				if (error.name === 'AbortError') {
					continue;
				}

				console.error('Deleted-account cleanup worker failed', {
					error: error.message,
				});

				if (running) {
					await waitForNextRun().catch(() => {});
				}
			}
		}
	}

	function start() {
		if (running) {
			return;
		}

		running = true;
		abortController = new AbortController();
		loopPromise = run();
	}

	async function stop() {
		if (!running) {
			return;
		}

		running = false;
		abortController.abort();
		await loopPromise;
	}

	return {
		processNext,
		start,
		stop,
	};
}
