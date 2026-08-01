import createRegistrationRoutes from '#server/modules/auth/registration/registrationRoutes';

import createRegisterController from '#server/modules/auth/registration/register/registerController';
import createRegisterService from '#server/modules/auth/registration/register/registerService';

export default function createRegistrationModule(authRepository, createRateLimitStore, appEnvironment = 'test') {
	const registerService = createRegisterService(authRepository, appEnvironment);

	const registerController = createRegisterController(registerService);

	return createRegistrationRoutes({
		createRateLimitStore,
		registerController,
	});
}
