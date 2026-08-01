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
import createTotpEncryption from '#server/modules/auth/totp/shared/createTotpEncryption';
import {
	decryptTotpSecret as defaultDecryptTotpSecret,
	encryptTotpSecret as defaultEncryptTotpSecret,
} from '#server/modules/auth/totp/shared/totpEncryption';

export default function createTotpModule(authRepository, db, createRateLimitStore, totpEncryptionKey) {
	const authenticated = requireAuth(db);
	const { decryptTotpSecret, encryptTotpSecret } = totpEncryptionKey
		? createTotpEncryption(totpEncryptionKey)
		: {
				decryptTotpSecret: defaultDecryptTotpSecret,
				encryptTotpSecret: defaultEncryptTotpSecret,
			};

	const disableTotpService = createDisableTotpService(authRepository, decryptTotpSecret);

	const enableTotpService = createEnableTotpService(authRepository, decryptTotpSecret);

	const getTotpStatusService = createGetTotpStatusService(authRepository);

	const regenerateRecoveryCodesService = createRegenerateRecoveryCodesService(authRepository, decryptTotpSecret);

	const setupTotpService = createSetupTotpService(authRepository, encryptTotpSecret);

	const verifyTotpLoginService = createVerifyTotpLoginService(authRepository, decryptTotpSecret);

	const disableTotpController = createDisableTotpController(disableTotpService);

	const enableTotpController = createEnableTotpController(enableTotpService);

	const getTotpStatusController = createGetTotpStatusController(getTotpStatusService);

	const regenerateRecoveryCodesController = createRegenerateRecoveryCodesController(regenerateRecoveryCodesService);

	const setupTotpController = createSetupTotpController(setupTotpService);

	const verifyTotpLoginController = createVerifyTotpLoginController(verifyTotpLoginService);

	return createTotpRoutes({
		authenticated,
		createRateLimitStore,
		disableTotpController,
		enableTotpController,
		getTotpStatusController,
		regenerateRecoveryCodesController,
		setupTotpController,
		verifyTotpLoginController,
	});
}
