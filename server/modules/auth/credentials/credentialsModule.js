import createCredentialsRoutes from '#server/modules/auth/credentials/credentialsRoutes';

import createLoginController from '#server/modules/auth/credentials/login/loginController';
import createLogoutController from '#server/modules/auth/credentials/logout/logoutController';

import createLoginService from '#server/modules/auth/credentials/login/loginService';
import createLogoutService from '#server/modules/auth/credentials/logout/logoutService';

export default function createCredentialsModule(authRepository, createRateLimitStore, appEnvironment = 'test') {
	const loginService = createLoginService(authRepository);
	const logoutService = createLogoutService();

	const loginController = createLoginController(loginService);

	const logoutController = createLogoutController(logoutService, appEnvironment);

	return createCredentialsRoutes({
		createRateLimitStore,
		loginController,
		logoutController,
	});
}
