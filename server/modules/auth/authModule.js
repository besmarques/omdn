import express from 'express';

import createAuthRepository from '#server/modules/auth/authRepository';
import createAuthRoutes from '#server/modules/auth/authRoutes';

import createCredentialsModule from '#server/modules/auth/credentials/credentialsModule';
import createEmailVerificationModule from '#server/modules/auth/emailVerification/emailVerificationModule';
import createPasswordRecoveryModule from '#server/modules/auth/passwordRecovery/passwordRecoveryModule';
import createRegistrationModule from '#server/modules/auth/registration/registrationModule';

export default function createAuthModule(db) {
	const router = express.Router();

	const authRepository = createAuthRepository(db);

	router.use(createAuthRoutes());

	router.use(
		createCredentialsModule(authRepository),
	);

	router.use(
		createRegistrationModule(authRepository),
	);

	router.use(
		createEmailVerificationModule(authRepository),
	);

	router.use(
		createPasswordRecoveryModule(authRepository),
	);

	return router;
}