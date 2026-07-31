import express from 'express';

import requireGuest from '#server/modules/auth/middleware/requireGuest';

export default function createTotpRoutes({
	authenticated,
	disableTotpController,
	enableTotpController,
	getTotpStatusController,
	regenerateRecoveryCodesController,
	setupTotpController,
	verifyTotpLoginController,
}) {
	const router = express.Router();

	router.get(
		'/totp/status',
		authenticated,
		getTotpStatusController,
	);

	router.post(
		'/totp/setup',
		authenticated,
		setupTotpController,
	);

	router.post(
		'/totp/enable',
		authenticated,
		enableTotpController,
	);

	router.post(
		'/totp/recovery-codes/regenerate',
		authenticated,
		regenerateRecoveryCodesController,
	);

	router.post(
		'/totp/disable',
		authenticated,
		disableTotpController,
	);

	router.post(
		'/totp/login/verify',
		requireGuest,
		verifyTotpLoginController,
	);

	return router;
}