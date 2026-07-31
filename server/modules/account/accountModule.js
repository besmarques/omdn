import createAccountRoutes from '#server/modules/account/accountRoutes';

import createChangePasswordController from '#server/modules/account/changePassword/changePasswordController';
import createChangePasswordService from '#server/modules/account/changePassword/changePasswordService';

import createDeleteAccountController from '#server/modules/account/deleteAccount/deleteAccountController';
import createDeleteAccountRepository from '#server/modules/account/deleteAccount/deleteAccountRepository';
import createDeleteAccountService from '#server/modules/account/deleteAccount/deleteAccountService';

import createGetCurrentAccountController from '#server/modules/account/getCurrent/getCurrentAccountController';
import createGetCurrentAccountService from '#server/modules/account/getCurrent/getCurrentAccountService';

import createAuthRepository from '#server/modules/auth/shared/authRepository';

import createAuthEventMiddleware from '#server/modules/auth/shared/events/authEventMiddleware';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';

function createOutcomeAudit({ authEvent, successEvent, failureEvent }) {
	return authEvent({
		eventType: ({ statusCode }) => (statusCode < 400 ? successEvent : failureEvent),

		metadata: ({ res, statusCode }) => ({
			statusCode,

			...(res.locals?.authEventMetadata ?? {}),
		}),
	});
}

export default function createAccountModule(db) {
	const authRepository = createAuthRepository(db);

	const deleteAccountRepository = createDeleteAccountRepository(db);

	const authEventRepository = createAuthEventRepository(db);

	const authEventService = createAuthEventService(authEventRepository);

	const authEvent = createAuthEventMiddleware(authEventService);

	const changePasswordService = createChangePasswordService(authRepository);

	const changePasswordController = createChangePasswordController(changePasswordService);

	const deleteAccountService = createDeleteAccountService(deleteAccountRepository);

	const deleteAccountController = createDeleteAccountController(deleteAccountService);

	const getCurrentAccountService = createGetCurrentAccountService();

	const getCurrentAccountController = createGetCurrentAccountController(getCurrentAccountService);

	const changePasswordAudit = createOutcomeAudit({
		authEvent,
		successEvent: 'password_changed',
		failureEvent: 'password_change_failed',
	});

	const deleteAccountAudit = createOutcomeAudit({
		authEvent,
		successEvent: 'account_deleted',
		failureEvent: 'account_delete_failed',
	});

	return createAccountRoutes({
		changePasswordAudit,
		changePasswordController,
		deleteAccountAudit,
		deleteAccountController,
		getCurrentAccountController,
	});
}
