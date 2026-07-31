import createPasswordRecoveryRoutes from '#server/modules/auth/passwordRecovery/passwordRecoveryRoutes';

import createForgotPasswordController from '#server/modules/auth/passwordRecovery/controllers/forgotPasswordController';
import createResetPasswordController from '#server/modules/auth/passwordRecovery/controllers/resetPasswordController';

import createForgotPasswordService from '#server/modules/auth/passwordRecovery/services/forgotPasswordService';
import createResetPasswordService from '#server/modules/auth/passwordRecovery/services/resetPasswordService';

export default function createPasswordRecoveryModule(
	authRepository,
) {
	const forgotPasswordService =
		createForgotPasswordService(authRepository);

	const resetPasswordService =
		createResetPasswordService(authRepository);

	const forgotPasswordController =
		createForgotPasswordController(
			forgotPasswordService,
		);

	const resetPasswordController =
		createResetPasswordController(
			resetPasswordService,
		);

	return createPasswordRecoveryRoutes({
		forgotPasswordController,
		resetPasswordController,
	});
}