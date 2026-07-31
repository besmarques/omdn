import createRegistrationRoutes from '#server/modules/auth/registration/registrationRoutes';

import createRegisterController from '#server/modules/auth/registration/controllers/registerController';
import createRegisterService from '#server/modules/auth/registration/services/registerService';

export default function createRegistrationModule(authRepository) {
	const registerService =
		createRegisterService(authRepository);

	const registerController =
		createRegisterController(registerService);

	return createRegistrationRoutes({
		registerController,
	});
}