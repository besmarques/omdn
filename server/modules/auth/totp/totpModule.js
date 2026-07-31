import createTotpRoutes from '#server/modules/auth/totp/totpRoutes';

import createDisableTotpController from '#server/modules/auth/totp/disable/disableTotpController';
import createEnableTotpController from '#server/modules/auth/totp/enable/enableTotpController';
import createGetTotpStatusController from '#server/modules/auth/totp/status/getTotpStatusController';
import createRegenerateRecoveryCodesController from '#server/modules/auth/totp/recoveryCodes/regenerateRecoveryCodesController';
import createSetupTotpController from '#server/modules/auth/totp/setup/setupTotpController';
import createVerifyTotpLoginController from '#server/modules/auth/totp/login/verifyTotpLoginController';

import createDisableTotpService from '#server/modules/auth/totp/disable/disableTotpService';
import createEnableTotpService from '#server/modules/auth/totp/enable/enableTotpService';
import createGetTotpStatusService from '#server/modules/auth/totp/status/getTotpStatusService';
import createRegenerateRecoveryCodesService from '#server/modules/auth/totp/recoveryCodes/regenerateRecoveryCodesService';
import createSetupTotpService from '#server/modules/auth/totp/setup/setupTotpService';
import createVerifyTotpLoginService from '#server/modules/auth/totp/login/verifyTotpLoginService';

import requireAuth from '#server/modules/auth/shared/middleware/requireAuth';

export default function createTotpModule(authRepository, db) {
	const authenticated = requireAuth(db);

	const disableTotpService = createDisableTotpService(authRepository);

	const enableTotpService = createEnableTotpService(authRepository);

	const getTotpStatusService = createGetTotpStatusService(authRepository);

	const regenerateRecoveryCodesService = createRegenerateRecoveryCodesService(authRepository);

	const setupTotpService = createSetupTotpService(authRepository);

	const verifyTotpLoginService = createVerifyTotpLoginService(authRepository);

	const disableTotpController = createDisableTotpController(disableTotpService);

	const enableTotpController = createEnableTotpController(enableTotpService);

	const getTotpStatusController = createGetTotpStatusController(getTotpStatusService);

	const regenerateRecoveryCodesController = createRegenerateRecoveryCodesController(regenerateRecoveryCodesService);

	const setupTotpController = createSetupTotpController(setupTotpService);

	const verifyTotpLoginController = createVerifyTotpLoginController(verifyTotpLoginService);

	return createTotpRoutes({
		authenticated,
		disableTotpController,
		enableTotpController,
		getTotpStatusController,
		regenerateRecoveryCodesController,
		setupTotpController,
		verifyTotpLoginController,
	});
}
