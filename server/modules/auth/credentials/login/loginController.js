import { loginSchema } from '#server/modules/auth/shared/authSchemas';
import { establishAuthenticatedSession } from '#server/modules/auth/shared/sessionPolicy';

const twoFactorChallengeDuration = 5 * 60 * 1000;
const maximumTwoFactorAttempts = 5;

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

		const { email, password, rememberMe } = validation.data;

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
				const expiresAt = Date.now() + twoFactorChallengeDuration;

				req.session.pendingTwoFactorUserId = user.id;
				req.session.pendingTwoFactorRememberMe = rememberMe;

				req.session.pendingTwoFactorExpiresAt = expiresAt;

				req.session.pendingTwoFactorAttempts = 0;

				await saveSession(req);

				return res.json({
					status: true,
					message: 'Two-factor authentication required',
					data: {
						authenticationState: 'totp_required',
						expiresAt: new Date(expiresAt).toISOString(),
						remainingAttempts: maximumTwoFactorAttempts,
					},
				});
			}

			await loginService.recordSuccessfulLogin({
				userId: user.id,
			});

			req.session.userId = user.id;
			establishAuthenticatedSession(req.session, { rememberMe });

			await saveSession(req);

			return res.json({
				status: true,
				message: 'Login successful',
				data: {
					authenticationState: 'authenticated',
					id: user.id,
					email: user.email,
					displayName: user.display_name,
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}
