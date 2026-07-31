import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';

import express from 'express';

import requireGuest from '#server/modules/auth/middleware/requireGuest';

import createLoginController from '#server/modules/auth/controllers/loginController';
import createRegisterController from '#server/modules/auth/controllers/registerController';
import createVerifyEmailController from '#server/modules/auth/controllers/verifyEmailController';

import createAuthRepository from '#server/modules/auth/authRepository';

import createLoginService from '#server/modules/auth/services/loginService';
import createRegisterService from '#server/modules/auth/services/registerService';
import createVerifyEmailService from '#server/modules/auth/services/verifyEmailService';

export default function createAuthRoutes(db) {
	const router = express.Router();
	const authRepository = createAuthRepository(db);

	const registerService =
		createRegisterService(authRepository);

	const verifyEmailService =
		createVerifyEmailService(authRepository);

	const loginService =
		createLoginService(authRepository);

	const registerController =
		createRegisterController(registerService);

	const verifyEmailController =
		createVerifyEmailController(verifyEmailService);

	const loginController =
		createLoginController(loginService);

	router.get('/status', (req, res) => {
		res.json({
			status: true,
			authenticated: Boolean(req.session?.userId),
		});
	});

	router.get('/guest-test', requireGuest, (req, res) => {
		res.json({
			status: true,
			message: 'This route is available only to guests',
		});
	});

	router.post(
		'/register',
		requireGuest,
		registerController,
	);

	router.post('/email/verify', verifyEmailController);

	router.post(
		'/email/resend',
		requireGuest,
		async (req, res, next) => {
			const email = String(req.body.email ?? '')
				.trim()
				.toLowerCase();

			const response = {
				status: true,
				message:
					'If the account exists and still requires verification, a new email will be sent.',
			};

			if (!email) {
				return res.json(response);
			}

			const connection = await db.getConnection();

			try {
				const [users] = await connection.execute(
					`
						SELECT id
						FROM users
						WHERE email = ?
							AND status = 'pending'
							AND email_verified_at IS NULL
						LIMIT 1
					`,
					[email],
				);

				const user = users[0];

				if (!user) {
					return res.json(response);
				}

				const verificationToken =
					randomBytes(32).toString('hex');

				const verificationTokenHash =
					createHash('sha256')
						.update(verificationToken)
						.digest();

				await connection.beginTransaction();

				await connection.execute(
					`
						DELETE FROM email_verification_tokens
						WHERE user_id = ?
							AND used_at IS NULL
					`,
					[user.id],
				);

				await connection.execute(
					`
						INSERT INTO email_verification_tokens (
							user_id,
							token_hash,
							expires_at
						)
						VALUES (
							?,
							?,
							DATE_ADD(
								CURRENT_TIMESTAMP(3),
								INTERVAL 24 HOUR
							)
						)
					`,
					[user.id, verificationTokenHash],
				);

				await connection.commit();

				if (process.env.APP_ENV === 'development') {
					console.log(
						`New verification token for ${email}: ${verificationToken}`,
					);
				}

				return res.json(response);
			} catch (error) {
				await connection.rollback();

				return next(error);
			} finally {
				connection.release();
			}
		},
	);

	router.post(
		'/login',
		requireGuest,
		loginController,
	);

	return router;
}