export default function createAuthEventService(authEventRepository) {
	async function record(event) {
		try {
			await authEventRepository.create(event);

			return {
				recorded: true,
			};
		} catch (error) {
			console.error('Unable to record authentication event', {
				eventType: event?.eventType ?? null,
				error: error.message,
			});

			return {
				recorded: false,
			};
		}
	}

	return {
		record,
	};
}
