import createCredentialsRoutes from '#server/modules/auth/credentials/credentialsRoutes';

import createLoginController from '#server/modules/auth/credentials/controllers/loginController';
import createLogoutController from '#server/modules/auth/credentials/controllers/logoutController';

import createLoginService from '#server/modules/auth/credentials/services/loginService';
import createLogoutService from '#server/modules/auth/credentials/services/logoutService';

export default function createCredentialsModule(authRepository) {
	const loginService = createLoginService(authRepository);
	const logoutService = createLogoutService();

	const loginController =
		createLoginController(loginService);

	const logoutController =
		createLogoutController(logoutService);

	return createCredentialsRoutes({
		loginController,
		logoutController,
	});
}