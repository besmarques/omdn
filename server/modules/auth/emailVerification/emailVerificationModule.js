import createWithConnection from '#server/dbConnect/withConnection';

import createEmailVerificationRepository from '#server/modules/auth/emailVerification/emailVerificationRepository';
import createEmailVerificationRoutes from '#server/modules/auth/emailVerification/emailVerificationRoutes';

import createResendVerificationEmailController from '#server/modules/auth/emailVerification/resend/resendVerificationEmailController';
import createVerifyEmailController from '#server/modules/auth/emailVerification/verify/verifyEmailController';

import createResendVerificationEmailService from '#server/modules/auth/emailVerification/resend/resendVerificationEmailService';
import createVerifyEmailService from '#server/modules/auth/emailVerification/verify/verifyEmailService';

export default function createEmailVerificationModule(db, createRateLimitStore, mailService) {
	const emailVerificationRepository = createEmailVerificationRepository(db);
	const withConnection = createWithConnection(db);
	const dependencies = { emailVerificationRepository, withConnection };
	const resendVerificationEmailService = createResendVerificationEmailService(dependencies, mailService);

	const verifyEmailService = createVerifyEmailService(dependencies);

	const resendVerificationEmailController = createResendVerificationEmailController(resendVerificationEmailService);

	const verifyEmailController = createVerifyEmailController(verifyEmailService);

	return createEmailVerificationRoutes({
		createRateLimitStore,
		resendVerificationEmailController,
		verifyEmailController,
	});
}
