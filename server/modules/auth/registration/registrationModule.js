import createWithConnection from '#server/dbConnect/withConnection';

import createEmailVerificationRepository from '#server/modules/auth/emailVerification/emailVerificationRepository';
import createRegistrationRepository from '#server/modules/auth/registration/registrationRepository';
import createRegistrationRoutes from '#server/modules/auth/registration/registrationRoutes';

import createRegisterController from '#server/modules/auth/registration/register/registerController';
import createRegisterService from '#server/modules/auth/registration/register/registerService';

export default function createRegistrationModule(db, createRateLimitStore, appEnvironment = 'test') {
	const emailVerificationRepository = createEmailVerificationRepository(db);
	const registrationRepository = createRegistrationRepository(db);
	const withConnection = createWithConnection(db);
	const registerService = createRegisterService({ emailVerificationRepository, registrationRepository, withConnection }, appEnvironment);

	const registerController = createRegisterController(registerService);

	return createRegistrationRoutes({
		createRateLimitStore,
		registerController,
	});
}
