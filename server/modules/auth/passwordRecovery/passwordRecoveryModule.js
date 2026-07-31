import createPasswordRecoveryRoutes from '#server/modules/auth/passwordRecovery/passwordRecoveryRoutes';

import createForgotPasswordController from '#server/modules/auth/passwordRecovery/forgot/forgotPasswordController';
import createResetPasswordController from '#server/modules/auth/passwordRecovery/reset/resetPasswordController';

import createForgotPasswordService from '#server/modules/auth/passwordRecovery/forgot/forgotPasswordService';
import createResetPasswordService from '#server/modules/auth/passwordRecovery/reset/resetPasswordService';

export default function createPasswordRecoveryModule(authRepository) {
	const forgotPasswordService = createForgotPasswordService(authRepository);

	const resetPasswordService = createResetPasswordService(authRepository);

	const forgotPasswordController = createForgotPasswordController(forgotPasswordService);

	const resetPasswordController = createResetPasswordController(resetPasswordService);

	return createPasswordRecoveryRoutes({
		forgotPasswordController,
		resetPasswordController,
	});
}
