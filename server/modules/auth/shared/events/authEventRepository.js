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

export function normalizeAuthEvent({
	userId = null,
	sessionId = null,
	eventType,
	success = true,
	ipAddress = null,
	userAgent = null,
	metadata = null,
}) {
	return {
		userId: normalizeUserId(userId),
		sessionId,
		eventType: normalizeEventType(eventType),
		success: Boolean(success),
		ipAddress,
		userAgent,
		metadata,
	};
}

export default function createAuthEventRepository(db) {
	async function create(event, { executor = db, outboxId = null } = {}) {
		const normalizedEvent = normalizeAuthEvent(event);

		const outboxColumn = outboxId === null ? '' : 'outbox_id,';
		const outboxValue = outboxId === null ? '' : '?,';
		const parameters = [
			normalizedEvent.userId,
			normalizedEvent.sessionId,
			normalizedEvent.eventType,
			normalizedEvent.success ? 1 : 0,
			normalizedEvent.ipAddress,
			normalizedEvent.userAgent,
			serializeMetadata(normalizedEvent.metadata),
		];

		if (outboxId !== null) {
			parameters.unshift(outboxId);
		}

		await executor.execute(
			`
				INSERT INTO auth_events (
					${outboxColumn}
					user_id,
					session_id,
					event_type,
					success,
					ip_address,
					user_agent,
					metadata
				)
				VALUES (
					${outboxValue}
					?,
					?,
					?,
					?,
					INET6_ATON(?),
					?,
					?
				)
			`,
			parameters,
		);
	}

	return {
		create,
	};
}
