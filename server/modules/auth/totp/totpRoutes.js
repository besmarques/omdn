import express from 'express';

import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

import {
	createRecoveryCodesRegenerationRateLimiters,
	createTotpDisableRateLimiters,
	createTotpLoginRateLimiter,
} from '#server/modules/auth/shared/middleware/authRateLimiters';

export default function createTotpRoutes({
	authenticated,
	createRateLimitStore,
	disableTotpController,
	enableTotpController,
	getTotpStatusController,
	regenerateRecoveryCodesController,
	setupTotpController,
	verifyTotpLoginController,
}) {
	const router = express.Router();

	const totpLoginRateLimiter = createTotpLoginRateLimiter(createRateLimitStore);
	const totpDisableRateLimiters = createTotpDisableRateLimiters(createRateLimitStore);
	const recoveryCodesRegenerationRateLimiters = createRecoveryCodesRegenerationRateLimiters(createRateLimitStore);

	router.get('/totp/status', authenticated, getTotpStatusController);

	router.post('/totp/setup', authenticated, setupTotpController);

	router.post('/totp/enable', authenticated, enableTotpController);

	router.post(
		'/totp/recovery-codes/regenerate',
		authenticated,
		...recoveryCodesRegenerationRateLimiters,
		regenerateRecoveryCodesController,
	);

	router.post('/totp/disable', authenticated, ...totpDisableRateLimiters, disableTotpController);

	router.post('/totp/login/verify', requireGuest, totpLoginRateLimiter, verifyTotpLoginController);

	return router;
}
