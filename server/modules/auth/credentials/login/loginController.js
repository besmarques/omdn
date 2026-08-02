import { loginSchema } from '#server/modules/auth/shared/authSchemas';

const twoFactorChallengeDuration = 5 * 60 * 1000;

function regenerateSession(req) {
	return new Promise((resolve, reject) => {
		req.session.regenerate((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});
}

function saveSession(req) {
	return new Promise((resolve, reject) => {
		req.session.save((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});
}

export default function createLoginController(loginService) {
	return async function login(req, res, next) {
		const validation = loginSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid login data',
			});
		}

		const { email, password } = validation.data;

		try {
			const authentication = await loginService.authenticateWithPassword(email, password);

			if (!authentication.success && authentication.code === 'INVALID_CREDENTIALS') {
				return res.status(401).json({
					status: false,
					message: 'Invalid email or password',
				});
			}

			if (!authentication.success && authentication.code === 'EMAIL_VERIFICATION_REQUIRED') {
				return res.status(403).json({
					status: false,
					message: 'Email verification required',
				});
			}

			if (!authentication.success && authentication.code === 'ACCOUNT_UNAVAILABLE') {
				return res.status(403).json({
					status: false,
					message: 'Account unavailable',
				});
			}

			const { user, requiresTwoFactor } = authentication;

			await regenerateSession(req);

			if (requiresTwoFactor) {
				req.session.pendingTwoFactorUserId = user.id;

				req.session.pendingTwoFactorExpiresAt = Date.now() + twoFactorChallengeDuration;

				req.session.pendingTwoFactorAttempts = 0;

				await saveSession(req);

				return res.status(202).json({
					status: true,
					message: 'Two-factor authentication required',
					data: {
						requiresTwoFactor: true,
					},
				});
			}

			await loginService.recordSuccessfulLogin({
				userId: user.id,
				currentSessionId: req.sessionID,
			});

			req.session.userId = user.id;

			await saveSession(req);

			return res.json({
				status: true,
				message: 'Login successful',
				data: {
					id: user.id,
					email: user.email,
					displayName: user.display_name,
					requiresTwoFactor: false,
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}
