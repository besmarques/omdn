import { changePasswordSchema } from '#server/modules/auth/shared/authSchemas';

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

export default function createChangePasswordController(changePasswordService) {
	return async function changePassword(req, res, next) {
		const validation = changePasswordSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid password change data',
				errors: validation.error.flatten().fieldErrors,
			});
		}

		const userId = req.auth.user.id;

		try {
			const result = await changePasswordService({
				userId,

				currentPassword: validation.data.currentPassword,

				newPassword: validation.data.newPassword,

				currentSessionId: req.sessionID,
			});

			if (!result.changed) {
				return res.status(400).json({
					status: false,
					message: 'Unable to change password',
				});
			}

			await regenerateSession(req);

			req.session.userId = userId;

			await saveSession(req);

			res.locals.authEventUserId = userId;

			res.locals.authEventMetadata = {
				sessionsRevoked: result.revokedSessions,
			};

			return res.json({
				status: true,
				message: 'Password changed successfully',
			});
		} catch (error) {
			return next(error);
		}
	};
}
