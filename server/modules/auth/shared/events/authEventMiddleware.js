import createAuthEventContext from '#server/modules/auth/shared/events/authEventContext';

function resolveValue(value, context) {
	if (typeof value === 'function') {
		return value(context);
	}

	return value;
}

function getUserId(req) {
	return req.auth?.user?.id ?? req.session?.userId ?? req.session?.pendingTwoFactorUserId ?? null;
}

export default function createAuthEventMiddleware(authEventService) {
	return function authEvent(configuration) {
		return function authEventMiddleware(req, res, next) {
			const initialContext = createAuthEventContext(req);

			const initialUserId = getUserId(req);

			res.once('finish', () => {
				const finalContext = createAuthEventContext(req);

				const finalUserId = getUserId(req);

				const resolutionContext = {
					req,
					res,
					statusCode: res.statusCode,
					initialUserId,
					finalUserId,
				};

				const eventType = resolveValue(configuration.eventType, resolutionContext);

				if (!eventType) {
					return;
				}

				const hasCustomUserId = Object.hasOwn(configuration, 'userId');

				const userId = hasCustomUserId
					? resolveValue(configuration.userId, resolutionContext)
					: (res.locals?.authEventUserId ?? finalUserId ?? initialUserId);

				const hasCustomSuccess = Object.hasOwn(configuration, 'success');

				const success = hasCustomSuccess ? Boolean(resolveValue(configuration.success, resolutionContext)) : res.statusCode < 400;

				const metadata = resolveValue(configuration.metadata ?? null, resolutionContext);

				void authEventService.record({
					userId,

					sessionId: finalContext.sessionId ?? initialContext.sessionId,

					eventType,
					success,

					ipAddress: finalContext.ipAddress ?? initialContext.ipAddress,

					userAgent: finalContext.userAgent ?? initialContext.userAgent,

					metadata,
				});
			});

			return next();
		};
	};
}
