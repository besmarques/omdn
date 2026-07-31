import createTotpRoutes from '#server/modules/auth/totp/totpRoutes';

import createEnableTotpController from '#server/modules/auth/totp/controllers/enableTotpController';
import createGetTotpStatusController from '#server/modules/auth/totp/controllers/getTotpStatusController';
import createRegenerateRecoveryCodesController from '#server/modules/auth/totp/controllers/regenerateRecoveryCodesController';
import createSetupTotpController from '#server/modules/auth/totp/controllers/setupTotpController';
import createVerifyTotpLoginController from '#server/modules/auth/totp/controllers/verifyTotpLoginController';

import createEnableTotpService from '#server/modules/auth/totp/services/enableTotpService';
import createGetTotpStatusService from '#server/modules/auth/totp/services/getTotpStatusService';
import createRegenerateRecoveryCodesService from '#server/modules/auth/totp/services/regenerateRecoveryCodesService';
import createSetupTotpService from '#server/modules/auth/totp/services/setupTotpService';
import createVerifyTotpLoginService from '#server/modules/auth/totp/services/verifyTotpLoginService';

import requireAuth from '#server/modules/auth/middleware/requireAuth';

export default function createTotpModule(
	authRepository,
	db,
) {
	const authenticated = requireAuth(db);

	const setupTotpService =
		createSetupTotpService(authRepository);

	const enableTotpService =
		createEnableTotpService(authRepository);

	const getTotpStatusService =
		createGetTotpStatusService(authRepository);

	const regenerateRecoveryCodesService =
		createRegenerateRecoveryCodesService(
			authRepository,
		);

	const verifyTotpLoginService =
		createVerifyTotpLoginService(authRepository);

	const setupTotpController =
		createSetupTotpController(setupTotpService);

	const enableTotpController =
		createEnableTotpController(enableTotpService);

	const getTotpStatusController =
		createGetTotpStatusController(
			getTotpStatusService,
		);

	const regenerateRecoveryCodesController =
		createRegenerateRecoveryCodesController(
			regenerateRecoveryCodesService,
		);

	const verifyTotpLoginController =
		createVerifyTotpLoginController(
			verifyTotpLoginService,
		);

	return createTotpRoutes({
		authenticated,
		setupTotpController,
		enableTotpController,
		getTotpStatusController,
		regenerateRecoveryCodesController,
		verifyTotpLoginController,
	});
}