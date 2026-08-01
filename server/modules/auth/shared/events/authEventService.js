export default function createAuthEventService(authEventRepository) {
	const pendingRecords = new Set();

	function record(event) {
		const operation = authEventRepository
			.create(event)
			.then(() => ({
				recorded: true,
			}))
			.catch((error) => {
				console.error('Unable to record authentication event', {
					eventType: event?.eventType ?? null,
					error: error.message,
				});

				return {
					recorded: false,
				};
			})
			.finally(() => {
				pendingRecords.delete(operation);
			});

		pendingRecords.add(operation);

		return operation;
	}

	async function drain() {
		await Promise.allSettled([...pendingRecords]);
	}

	return {
		drain,
		record,
	};
}
