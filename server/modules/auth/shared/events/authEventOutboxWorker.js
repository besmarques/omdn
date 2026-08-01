import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

function getRetryDelayMs(attempts) {
	return Math.min(5 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 8));
}

export default function createAuthEventOutboxWorker({
	authEventRepository,
	outboxRepository,
	pollIntervalMs = 1000,
	staleLockMs = 5 * 60 * 1000,
	workerId = randomUUID(),
}) {
	let abortController;
	let loopPromise;
	let running = false;

	async function processNext() {
		const item = await outboxRepository.claimNext(workerId, staleLockMs);

		if (!item) {
			return false;
		}

		try {
			await outboxRepository.complete(item, workerId, authEventRepository);
		} catch (error) {
			const retryDelayMs = getRetryDelayMs(item.attempts);

			await outboxRepository.fail(item, workerId, error, retryDelayMs);

			console.error('Unable to deliver authentication event from outbox', {
				attempts: item.attempts + 1,
				error: error.message,
				outboxId: item.id,
				retryDelayMs,
			});
		}

		return true;
	}

	async function run() {
		while (running) {
			try {
				const processed = await processNext();

				if (!processed && running) {
					await delay(pollIntervalMs, undefined, {
						signal: abortController.signal,
					});
				}
			} catch (error) {
				if (error.name === 'AbortError') {
					continue;
				}

				console.error('Authentication event outbox worker failed', {
					error: error.message,
				});

				if (running) {
					await delay(pollIntervalMs, undefined, {
						signal: abortController.signal,
					}).catch(() => {});
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
