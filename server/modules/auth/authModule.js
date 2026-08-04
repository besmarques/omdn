import express from 'express';

import createAuthRoutes from '#server/modules/auth/authRoutes';

import createAuthEventPolicy from '#server/modules/auth/shared/events/authEventPolicy';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';

import createCredentialsModule from '#server/modules/auth/credentials/credentialsModule';
import createEmailVerificationModule from '#server/modules/auth/emailVerification/emailVerificationModule';
import createPasswordRecoveryModule from '#server/modules/auth/passwordRecovery/passwordRecoveryModule';
import createRegistrationModule from '#server/modules/auth/registration/registrationModule';
import createTotpModule from '#server/modules/auth/totp/totpModule';

export default function createAuthModule(db, createRateLimitStore, providedAuthEventService, config, mailService) {
	const router = express.Router();

	const authEventRepository = createAuthEventRepository(db);

	const authEventService = providedAuthEventService ?? createAuthEventService(authEventRepository);

	const authEventPolicy = createAuthEventPolicy(authEventService);

	router.use(authEventPolicy);

	router.use(createAuthRoutes());

	router.use(createCredentialsModule(db, createRateLimitStore, config?.appEnvironment ?? 'test'));

	router.use(createRegistrationModule(db, createRateLimitStore, mailService));

	router.use(createEmailVerificationModule(db, createRateLimitStore, mailService));

	router.use(createPasswordRecoveryModule(db, createRateLimitStore, config?.appEnvironment ?? 'test'));

	router.use(createTotpModule(db, createRateLimitStore, config?.totpEncryptionKey));

	return router;
}
