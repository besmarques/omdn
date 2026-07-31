import createAuthRoutes from '#server/modules/auth/authRoutes';

import createLoginController from '#server/modules/auth/controllers/loginController';
import createRegisterController from '#server/modules/auth/controllers/registerController';
import createResendVerificationEmailController from '#server/modules/auth/controllers/resendVerificationEmailController';
import createVerifyEmailController from '#server/modules/auth/controllers/verifyEmailController';

import createAuthRepository from '#server/modules/auth/authRepository';

import createLoginService from '#server/modules/auth/services/loginService';
import createRegisterService from '#server/modules/auth/services/registerService';
import createResendVerificationEmailService from '#server/modules/auth/services/resendVerificationEmailService';
import createVerifyEmailService from '#server/modules/auth/services/verifyEmailService';

export default function createAuthModule(db) {
	const authRepository = createAuthRepository(db);

	const loginService = createLoginService(authRepository);

	const registerService =
		createRegisterService(authRepository);

	const resendVerificationEmailService =
		createResendVerificationEmailService(authRepository);

	const verifyEmailService =
		createVerifyEmailService(authRepository);

	const loginController =
		createLoginController(loginService);

	const registerController =
		createRegisterController(registerService);

	const resendVerificationEmailController =
		createResendVerificationEmailController(
			resendVerificationEmailService,
		);

	const verifyEmailController =
		createVerifyEmailController(verifyEmailService);

	return createAuthRoutes({
		loginController,
		registerController,
		resendVerificationEmailController,
		verifyEmailController,
	});
}