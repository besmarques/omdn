import { randomUUID } from 'node:crypto';

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function getCorrelationId(req) {
	const suppliedId = req.get('x-correlation-id');

	if (suppliedId && CORRELATION_ID_PATTERN.test(suppliedId)) {
		return suppliedId;
	}

	return randomUUID();
}

export function apiRequestContext(req, res, next) {
	req.correlationId = getCorrelationId(req);
	res.set('x-correlation-id', req.correlationId);

	return next();
}

export function apiErrorHandler(error, req, res, next) {
	const correlationId = req.correlationId ?? getCorrelationId(req);

	if (!res.get('x-correlation-id')) {
		res.set('x-correlation-id', correlationId);
	}

	console.error('Unhandled API error', {
		correlationId,
		error,
		method: req.method,
		path: req.originalUrl,
	});

	if (res.headersSent) {
		return next(error);
	}

	return res.status(500).json({
		status: false,
		message: 'Internal server error',
		correlationId,
	});
}
