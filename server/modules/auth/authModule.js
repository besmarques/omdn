import express from 'express';

import createAuthRepository from '#server/modules/auth/shared/authRepository';
import createAuthRoutes from '#server/modules/auth/authRoutes';

import createAuthEventPolicy from '#server/modules/auth/shared/events/authEventPolicy';
import createAuthEventRepository from '#server/modules/auth/shared/events/authEventRepository';
import createAuthEventService from '#server/modules/auth/shared/events/authEventService';

import createCredentialsModule from '#server/modules/auth/credentials/credentialsModule';
import createEmailVerificationModule from '#server/modules/auth/emailVerification/emailVerificationModule';
import createPasswordRecoveryModule from '#server/modules/auth/passwordRecovery/passwordRecoveryModule';
import createRegistrationModule from '#server/modules/auth/registration/registrationModule';
import createTotpModule from '#server/modules/auth/totp/totpModule';

export default function createAuthModule(db) {
	const router = express.Router();

	const authRepository = createAuthRepository(db);

	const authEventRepository = createAuthEventRepository(db);

	const authEventService = createAuthEventService(authEventRepository);

	const authEventPolicy = createAuthEventPolicy(authEventService);

	router.use(authEventPolicy);

	router.use(createAuthRoutes());

	router.use(createCredentialsModule(authRepository));

	router.use(createRegistrationModule(authRepository));

	router.use(createEmailVerificationModule(authRepository));

	router.use(createPasswordRecoveryModule(authRepository));

	router.use(createTotpModule(authRepository, db));

	return router;
}
