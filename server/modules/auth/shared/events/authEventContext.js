function normalizeText(value, maximumLength) {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();

	if (!normalized) {
		return null;
	}

	return normalized.slice(0, maximumLength);
}

function normalizeIpAddress(value) {
	const normalized = normalizeText(value, 128);

	if (!normalized) {
		return null;
	}

	const withoutZone = normalized.split('%')[0];

	if (withoutZone.startsWith('::ffff:')) {
		return withoutZone.slice(7);
	}

	return withoutZone;
}

export default function createAuthEventContext(req) {
	const userAgent =
		typeof req.get === 'function'
			? req.get('user-agent')
			: req.headers?.['user-agent'];

	return {
		sessionId: normalizeText(
			req.sessionID,
			128,
		),

		ipAddress: normalizeIpAddress(
			req.ip ??
				req.socket?.remoteAddress,
		),

		userAgent: normalizeText(
			userAgent,
			512,
		),
	};
}