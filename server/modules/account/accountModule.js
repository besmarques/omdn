import createAccountRoutes from '#server/modules/account/accountRoutes';
import createGetCurrentAccountController from '#server/modules/account/controllers/getCurrentAccountController';
import createGetCurrentAccountService from '#server/modules/account/services/getCurrentAccountService';

export default function createAccountModule() {
	const getCurrentAccountService =
		createGetCurrentAccountService();

	const getCurrentAccountController =
		createGetCurrentAccountController(
			getCurrentAccountService,
		);

	return createAccountRoutes({
		getCurrentAccountController,
	});
}