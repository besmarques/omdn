import createEmailVerificationRoutes from '#server/modules/auth/emailVerification/emailVerificationRoutes';

import createResendVerificationEmailController from '#server/modules/auth/emailVerification/resend/resendVerificationEmailController';
import createVerifyEmailController from '#server/modules/auth/emailVerification/verify/verifyEmailController';

import createResendVerificationEmailService from '#server/modules/auth/emailVerification/resend/resendVerificationEmailService';
import createVerifyEmailService from '#server/modules/auth/emailVerification/verify/verifyEmailService';

export default function createEmailVerificationModule(authRepository, createRateLimitStore, appEnvironment = 'test') {
	const resendVerificationEmailService = createResendVerificationEmailService(authRepository, appEnvironment);

	const verifyEmailService = createVerifyEmailService(authRepository);

	const resendVerificationEmailController = createResendVerificationEmailController(resendVerificationEmailService);

	const verifyEmailController = createVerifyEmailController(verifyEmailService);

	return createEmailVerificationRoutes({
		createRateLimitStore,
		resendVerificationEmailController,
		verifyEmailController,
	});
}
