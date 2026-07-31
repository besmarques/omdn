import createEmailVerificationRoutes from '#server/modules/auth/emailVerification/emailVerificationRoutes';

import createResendVerificationEmailController from '#server/modules/auth/emailVerification/resend/resendVerificationEmailController';
import createVerifyEmailController from '#server/modules/auth/emailVerification/verify/verifyEmailController';

import createResendVerificationEmailService from '#server/modules/auth/emailVerification/resend/resendVerificationEmailService';
import createVerifyEmailService from '#server/modules/auth/emailVerification/verify/verifyEmailService';

export default function createEmailVerificationModule(
	authRepository,
) {
	const resendVerificationEmailService =
		createResendVerificationEmailService(authRepository);

	const verifyEmailService =
		createVerifyEmailService(authRepository);

	const resendVerificationEmailController =
		createResendVerificationEmailController(
			resendVerificationEmailService,
		);

	const verifyEmailController =
		createVerifyEmailController(verifyEmailService);

	return createEmailVerificationRoutes({
		resendVerificationEmailController,
		verifyEmailController,
	});
}