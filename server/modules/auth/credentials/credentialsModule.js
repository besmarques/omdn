import createWithConnection from '#server/dbConnect/withConnection';

import createCredentialsRepository from '#server/modules/auth/credentials/credentialsRepository';
import createCredentialsRoutes from '#server/modules/auth/credentials/credentialsRoutes';
import createTotpRepository from '#server/modules/auth/totp/totpRepository';

import createLoginController from '#server/modules/auth/credentials/login/loginController';
import createLogoutController from '#server/modules/auth/credentials/logout/logoutController';

import createLoginService from '#server/modules/auth/credentials/login/loginService';
import createLogoutService from '#server/modules/auth/credentials/logout/logoutService';

export default function createCredentialsModule(db, createRateLimitStore, appEnvironment = 'test') {
	const credentialsRepository = createCredentialsRepository(db);
	const totpRepository = createTotpRepository(db);
	const withConnection = createWithConnection(db);
	const loginService = createLoginService({
		credentialsRepository,
		totpRepository,
		withConnection,
	});
	const logoutService = createLogoutService();

	const loginController = createLoginController(loginService);

	const logoutController = createLogoutController(logoutService, appEnvironment);

	return createCredentialsRoutes({
		createRateLimitStore,
		loginController,
		logoutController,
	});
}
