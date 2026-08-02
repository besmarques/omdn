import createWithConnection from '#server/dbConnect/withConnection';

import createAccountRoutes from '#server/modules/account/accountRoutes';

import createChangePasswordController from '#server/modules/account/changePassword/changePasswordController';
import createChangePasswordService from '#server/modules/account/changePassword/changePasswordService';

import createDeleteAccountController from '#server/modules/account/deleteAccount/deleteAccountController';
import createDeleteAccountRepository from '#server/modules/account/deleteAccount/deleteAccountRepository';
import createDeleteAccountService from '#server/modules/account/deleteAccount/deleteAccountService';

import createGetCurrentAccountController from '#server/modules/account/getCurrent/getCurrentAccountController';
import createGetCurrentAccountService from '#server/modules/account/getCurrent/getCurrentAccountService';

import createCredentialsRepository from '#server/modules/auth/credentials/credentialsRepository';
import createSessionRepository from '#server/modules/auth/shared/sessionRepository';
import createTotpEncryption from '#server/modules/auth/totp/shared/createTotpEncryption';
import { decryptTotpSecret as defaultDecryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

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

export default function createAccountModule(db, createRateLimitStore, providedAuthEventService, config) {
	const credentialsRepository = createCredentialsRepository(db);
	const sessionRepository = createSessionRepository(db);
	const withConnection = createWithConnection(db);
	const { decryptTotpSecret } = config?.totpEncryptionKey
		? createTotpEncryption(config.totpEncryptionKey)
		: { decryptTotpSecret: defaultDecryptTotpSecret };

	const deleteAccountRepository = createDeleteAccountRepository(db);

	const authEventRepository = createAuthEventRepository(db);

	const authEventService = providedAuthEventService ?? createAuthEventService(authEventRepository);

	const authEvent = createAuthEventMiddleware(authEventService);

	const changePasswordService = createChangePasswordService({ credentialsRepository, sessionRepository, withConnection });

	const changePasswordController = createChangePasswordController(changePasswordService);

	const deleteAccountService = createDeleteAccountService(deleteAccountRepository, decryptTotpSecret);

	const deleteAccountController = createDeleteAccountController(deleteAccountService, config?.appEnvironment ?? 'test');

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
		createRateLimitStore,
		deleteAccountAudit,
		deleteAccountController,
		getCurrentAccountController,
	});
}
