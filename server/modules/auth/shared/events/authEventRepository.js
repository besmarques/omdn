function normalizeUserId(value) {
	const userId = Number(value);

	if (!Number.isSafeInteger(userId) || userId <= 0) {
		return null;
	}

	return userId;
}

function normalizeEventType(value) {
	if (typeof value !== 'string' || !/^[a-z0-9_:-]{1,64}$/.test(value)) {
		throw new Error('Invalid authentication event type');
	}

	return value;
}

function serializeMetadata(metadata) {
	if (metadata === undefined || metadata === null) {
		return null;
	}

	return JSON.stringify(metadata);
}

export default function createAuthEventRepository(db) {
	async function create({
		userId = null,
		sessionId = null,
		eventType,
		success = true,
		ipAddress = null,
		userAgent = null,
		metadata = null,
	}) {
		await db.execute(
			`
				INSERT INTO auth_events (
					user_id,
					session_id,
					event_type,
					success,
					ip_address,
					user_agent,
					metadata
				)
				VALUES (
					?,
					?,
					?,
					?,
					INET6_ATON(?),
					?,
					?
				)
			`,
			[
				normalizeUserId(userId),
				sessionId,
				normalizeEventType(eventType),
				success ? 1 : 0,
				ipAddress,
				userAgent,
				serializeMetadata(metadata),
			],
		);
	}

	return {
		create,
	};
}
