import createWithConnection from '#server/dbConnect/withConnection';

import createCredentialsRepository from '#server/modules/auth/credentials/credentialsRepository';
import createPasswordRecoveryRepository from '#server/modules/auth/passwordRecovery/passwordRecoveryRepository';
import createPasswordRecoveryRoutes from '#server/modules/auth/passwordRecovery/passwordRecoveryRoutes';
import createSessionRepository from '#server/modules/auth/shared/sessionRepository';

import createForgotPasswordController from '#server/modules/auth/passwordRecovery/forgot/forgotPasswordController';
import createResetPasswordController from '#server/modules/auth/passwordRecovery/reset/resetPasswordController';

import createForgotPasswordService from '#server/modules/auth/passwordRecovery/forgot/forgotPasswordService';
import createResetPasswordService from '#server/modules/auth/passwordRecovery/reset/resetPasswordService';

export default function createPasswordRecoveryModule(db, createRateLimitStore, appEnvironment = 'test') {
	const credentialsRepository = createCredentialsRepository(db);
	const passwordRecoveryRepository = createPasswordRecoveryRepository(db);
	const sessionRepository = createSessionRepository(db);
	const withConnection = createWithConnection(db);
	const forgotPasswordService = createForgotPasswordService({ passwordRecoveryRepository, withConnection }, appEnvironment);

	const resetPasswordService = createResetPasswordService({
		credentialsRepository,
		passwordRecoveryRepository,
		sessionRepository,
		withConnection,
	});

	const forgotPasswordController = createForgotPasswordController(forgotPasswordService);

	const resetPasswordController = createResetPasswordController(resetPasswordService);

	return createPasswordRecoveryRoutes({
		createRateLimitStore,
		forgotPasswordController,
		resetPasswordController,
	});
}
