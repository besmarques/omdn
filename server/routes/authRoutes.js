import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';

import argon2 from 'argon2';
import express from 'express';
import { z } from 'zod';

import requireGuest from '#server/middleware/auth/requireGuest';

const registerSchema = z.object({
	displayName: z
		.string()
		.trim()
		.min(2, 'Display name must contain at least 2 characters')
		.max(100, 'Display name cannot exceed 100 characters'),

	email: z.string().trim().toLowerCase().email('Invalid email address').max(254, 'Email address is too long'),

	password: z.string().min(15, 'Password must contain at least 15 characters').max(128, 'Password cannot exceed 128 characters'),
});

const loginSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email(),

	password: z
		.string()
		.min(1)
		.max(128),
});

const emailVerificationSchema = z.object({
	token: z
		.string()
		.trim()
		.regex(/^[a-f0-9]{64}$/i, 'Invalid verification token'),
});

const registrationResponse = {
	status: true,
	message: 'If the email address can be registered, a verification email will be sent.',
};

export default function createAuthRoutes(db) {
	const router = express.Router();

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

	router.post('/register', requireGuest, async (req, res, next) => {
		const validation = registerSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid registration data',
				errors: validation.error.flatten().fieldErrors,
			});
		}

		const { displayName, email, password } = validation.data;

		const connection = await db.getConnection();

		try {
			const [existingUsers] = await connection.execute(
				`
					SELECT id
					FROM users
					WHERE email = ?
					LIMIT 1
				`,
				[email],
			);

			if (existingUsers.length > 0) {
				return res.status(202).json(registrationResponse);
			}

			const passwordHash = await argon2.hash(password, {
				type: argon2.argon2id,
				memoryCost: 19456,
				timeCost: 2,
				parallelism: 1,
			});

			const verificationToken = randomBytes(32).toString('hex');

			const verificationTokenHash = createHash('sha256').update(verificationToken).digest();

			await connection.beginTransaction();

			const [userResult] = await connection.execute(
				`
					INSERT INTO users (
						email,
						display_name,
						password_hash,
						status
					)
					VALUES (?, ?, ?, 'pending')
				`,
				[email, displayName, passwordHash],
			);

			const userId = userResult.insertId;

			const [roleResult] = await connection.execute(
				`
					INSERT INTO user_roles (
						user_id,
						role_id
					)
					SELECT ?, id
					FROM roles
					WHERE slug = 'subscriber'
				`,
				[userId],
			);

			if (roleResult.affectedRows !== 1) {
				throw new Error('Subscriber role is not configured');
			}

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
						DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 24 HOUR)
					)
				`,
				[userId, verificationTokenHash],
			);

			await connection.commit();

			if (process.env.APP_ENV === 'development') {
				console.log(`Verification token for ${email}: ${verificationToken}`);
			}

			return res.status(201).json(registrationResponse);
		} catch (error) {
			await connection.rollback();

			if (error.code === 'ER_DUP_ENTRY') {
				return res.status(202).json(registrationResponse);
			}

			return next(error);
		} finally {
			connection.release();
		}
	});

	router.post('/email/verify', async (req, res, next) => {
		const validation = emailVerificationSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid or expired verification token',
			});
		}

		const tokenHash = createHash('sha256').update(validation.data.token).digest();

		const connection = await db.getConnection();

		try {
			await connection.beginTransaction();

			const [tokens] = await connection.execute(
				`
				SELECT
					email_verification_tokens.id,
					email_verification_tokens.user_id,
					users.status
				FROM email_verification_tokens
				INNER JOIN users
					ON users.id = email_verification_tokens.user_id
				WHERE email_verification_tokens.token_hash = ?
					AND email_verification_tokens.used_at IS NULL
					AND email_verification_tokens.expires_at > CURRENT_TIMESTAMP(3)
				LIMIT 1
				FOR UPDATE
			`,
				[tokenHash],
			);

			const verification = tokens[0];

			if (!verification || !['pending', 'active'].includes(verification.status)) {
				await connection.rollback();

				return res.status(400).json({
					status: false,
					message: 'Invalid or expired verification token',
				});
			}

			await connection.execute(
				`
				UPDATE users
				SET
					status = 'active',
					email_verified_at = COALESCE(
						email_verified_at,
						CURRENT_TIMESTAMP(3)
					)
				WHERE id = ?
					AND status IN ('pending', 'active')
			`,
				[verification.user_id],
			);

			await connection.execute(
				`
				UPDATE email_verification_tokens
				SET used_at = CURRENT_TIMESTAMP(3)
				WHERE user_id = ?
					AND used_at IS NULL
			`,
				[verification.user_id],
			);

			await connection.commit();

			return res.json({
				status: true,
				message: 'Email verified successfully',
			});
		} catch (error) {
			await connection.rollback();
			return next(error);
		} finally {
			connection.release();
		}
	});

	router.post('/email/resend', requireGuest, async (req, res, next) => {
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

		const verificationToken = randomBytes(32).toString('hex');

		const verificationTokenHash = createHash('sha256')
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
					DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 24 HOUR)
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
});

router.post('/login', requireGuest, async (req, res, next) => {
	const validation = loginSchema.safeParse(req.body);

	if (!validation.success) {
		return res.status(400).json({
			status: false,
			message: 'Invalid login data',
		});
	}

	const { email, password } = validation.data;

	try {
		const [users] = await db.execute(
			`
				SELECT
					id,
					email,
					display_name,
					password_hash,
					status,
					email_verified_at
				FROM users
				WHERE email = ?
				LIMIT 1
			`,
			[email],
		);

		const user = users[0];

		if (!user || !user.password_hash) {
			return res.status(401).json({
				status: false,
				message: 'Invalid email or password',
			});
		}

		const passwordIsValid = await argon2.verify(
			user.password_hash,
			password,
		);

		if (!passwordIsValid) {
			return res.status(401).json({
				status: false,
				message: 'Invalid email or password',
			});
		}

		if (
			user.status === 'pending' ||
			!user.email_verified_at
		) {
			return res.status(403).json({
				status: false,
				message: 'Email verification required',
			});
		}

		if (user.status !== 'active') {
			return res.status(403).json({
				status: false,
				message: 'Account unavailable',
			});
		}

		req.session.regenerate((regenerateError) => {
			if (regenerateError) {
				return next(regenerateError);
			}

			req.session.userId = user.id;

			req.session.save(async (saveError) => {
				if (saveError) {
					return next(saveError);
				}

				try {
					await db.execute(
						`
							UPDATE users
							SET last_login_at = CURRENT_TIMESTAMP(3)
							WHERE id = ?
						`,
						[user.id],
					);

					return res.json({
						status: true,
						message: 'Login successful',
						data: {
							id: user.id,
							email: user.email,
							displayName: user.display_name,
						},
					});
				} catch (error) {
					return next(error);
				}
			});
		});
	} catch (error) {
		return next(error);
	}
});

	return router;
}
