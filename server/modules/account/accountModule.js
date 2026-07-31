import createAccountRoutes from '#server/modules/account/accountRoutes';
import createGetCurrentAccountController from '#server/modules/account/getCurrent/getCurrentAccountController';
import createGetCurrentAccountService from '#server/modules/account/getCurrent/getCurrentAccountService';

export default function createAccountModule() {
	const getCurrentAccountService = createGetCurrentAccountService();

	const getCurrentAccountController = createGetCurrentAccountController(getCurrentAccountService);

	return createAccountRoutes({
		getCurrentAccountController,
	});
}
