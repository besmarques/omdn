import { totpLoginSchema } from '#server/modules/auth/shared/authSchemas';

const maximumAttempts = 5;

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

function clearPendingChallenge(session) {
	delete session.pendingTwoFactorUserId;
	delete session.pendingTwoFactorExpiresAt;
	delete session.pendingTwoFactorAttempts;
}

function invalidCodeResponse(res) {
	return res.status(401).json({
		status: false,
		message: 'Invalid or expired authentication code',
	});
}

export default function createVerifyTotpLoginController(verifyTotpLoginService) {
	return async function verifyTotpLogin(req, res, next) {
		const validation = totpLoginSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid authentication code',
			});
		}

		try {
			const pendingUserId = Number(req.session?.pendingTwoFactorUserId);

			const expiresAt = Number(req.session?.pendingTwoFactorExpiresAt);

			if (!Number.isSafeInteger(pendingUserId) || pendingUserId <= 0 || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
				if (req.session) {
					clearPendingChallenge(req.session);

					await saveSession(req);
				}

				return invalidCodeResponse(res);
			}

			const result = await verifyTotpLoginService.verifySecondFactor({
				userId: pendingUserId,
				code: validation.data.code,
			});

			if (!result.verified) {
				const attempts = Number(req.session.pendingTwoFactorAttempts) + 1;

				req.session.pendingTwoFactorAttempts = attempts;

				if (attempts >= maximumAttempts) {
					clearPendingChallenge(req.session);
				}

				await saveSession(req);

				return invalidCodeResponse(res);
			}

			await regenerateSession(req);

			await verifyTotpLoginService.recordSuccessfulLogin({
				userId: result.user.id,
				currentSessionId: req.sessionID,
			});

			req.session.userId = result.user.id;

			await saveSession(req);

			return res.json({
				status: true,
				message: 'Login successful',
				data: {
					id: result.user.id,
					email: result.user.email,
					displayName: result.user.display_name,
					recoveryCodeUsed: result.method === 'recovery_code',
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}
