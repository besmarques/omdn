import { setTimeout as delay } from 'node:timers/promises';

export default function createPublicationScheduleWorker({ repository, pollIntervalMs = 1000 }) {
	let abortController;
	let loopPromise;
	let running = false;

	async function processNext() {
		return repository.publishNextDue();
	}

	async function run() {
		while (running) {
			try {
				const processed = await processNext();

				if (!processed && running) {
					await delay(pollIntervalMs, undefined, { signal: abortController.signal });
				}
			} catch (error) {
				if (error.name !== 'AbortError') {
					console.error('Scheduled publication worker failed', { error: error.message });
				}

				if (running) {
					await delay(pollIntervalMs, undefined, { signal: abortController.signal }).catch(() => {});
				}
			}
		}
	}

	function start() {
		if (running) return;
		running = true;
		abortController = new AbortController();
		loopPromise = run();
	}

	async function stop() {
		if (!running) return;
		running = false;
		abortController.abort();
		await loopPromise;
	}

	return { processNext, start, stop };
}
