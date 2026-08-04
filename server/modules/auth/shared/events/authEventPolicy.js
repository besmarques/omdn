import createAuthEventMiddleware from '#server/modules/auth/shared/events/authEventMiddleware';

function outcomeEvent(successEventType, failureEventType) {
	return ({ statusCode }) => (statusCode < 400 ? successEventType : failureEventType);
}

function loginEvent({ req, statusCode }) {
	if (statusCode === 200 && req.session?.pendingTwoFactorUserId) {
		return 'login_two_factor_required';
	}

	if (statusCode === 200) {
		return 'login_succeeded';
	}

	return 'login_failed';
}

const policies = new Map([
	[
		'POST /register',
		{
			eventType: outcomeEvent('registration_succeeded', 'registration_failed'),
		},
	],

	[
		'POST /login',
		{
			eventType: loginEvent,
		},
	],

	[
		'POST /logout',
		{
			eventType: outcomeEvent('logout_succeeded', 'logout_failed'),
		},
	],

	[
		'POST /password/forgot',
		{
			eventType: 'password_reset_requested',
		},
	],

	[
		'POST /password/reset',
		{
			eventType: outcomeEvent('password_reset_completed', 'password_reset_failed'),
		},
	],

	[
		'POST /email/verify',
		{
			eventType: outcomeEvent('email_verified', 'email_verification_failed'),
		},
	],

	[
		'POST /email/resend',
		{
			eventType: 'email_verification_resend_requested',
		},
	],

	[
		'POST /totp/setup',
		{
			eventType: outcomeEvent('totp_setup_created', 'totp_setup_failed'),
		},
	],

	[
		'POST /totp/enable',
		{
			eventType: outcomeEvent('totp_enabled', 'totp_enable_failed'),
		},
	],

	[
		'POST /totp/disable',
		{
			eventType: outcomeEvent('totp_disabled', 'totp_disable_failed'),
		},
	],

	[
		'POST /totp/login/verify',
		{
			eventType: outcomeEvent('totp_login_succeeded', 'totp_login_failed'),
		},
	],

	[
		'POST /totp/recovery-codes/regenerate',
		{
			eventType: outcomeEvent('recovery_codes_regenerated', 'recovery_codes_regeneration_failed'),
		},
	],
]);

function normalizePath(pathname) {
	if (typeof pathname !== 'string' || pathname === '') {
		return '/';
	}

	if (pathname === '/') {
		return pathname;
	}

	return pathname.replace(/\/+$/, '');
}

export function resolveAuthEventPolicy(req) {
	const key = [req.method.toUpperCase(), normalizePath(req.path)].join(' ');

	const policy = policies.get(key);

	if (!policy) {
		return null;
	}

	return {
		...policy,

		metadata({ res, statusCode }) {
			const additionalMetadata = res.locals?.authEventMetadata;

			const safeAdditionalMetadata =
				additionalMetadata && typeof additionalMetadata === 'object' && !Array.isArray(additionalMetadata) ? additionalMetadata : {};

			return {
				statusCode,
				rateLimited: statusCode === 429,
				...safeAdditionalMetadata,
			};
		},
	};
}

export default function createAuthEventPolicy(authEventService) {
	const authEvent = createAuthEventMiddleware(authEventService);

	return function authEventPolicy(req, res, next) {
		const policy = resolveAuthEventPolicy(req);

		if (!policy) {
			return next();
		}

		return authEvent(policy)(req, res, next);
	};
}
