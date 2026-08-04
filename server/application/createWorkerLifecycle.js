export default function createWorkerLifecycle(workers) {
	return Object.freeze({
		start() {
			for (const worker of workers) {
				worker.start();
			}
		},

		async stop() {
			await Promise.all(workers.map((worker) => worker.stop()));
		},
	});
}
