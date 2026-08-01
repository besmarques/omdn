import { deleteAccountSchema } from '#server/modules/account/deleteAccount/deleteAccountSchema';

const sessionCookieName = 'omdn_session';

function destroySession(session) {
	if (!session) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		session.destroy((error) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});
}

export default function createDeleteAccountController(deleteAccountService, appEnvironment = 'test') {
	return async function deleteAccount(req, res, next) {
		const validation = deleteAccountSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid account deletion data',
				errors: validation.error.flatten().fieldErrors,
			});
		}

		const userId = req.auth.user.id;

		try {
			const result = await deleteAccountService({
				userId,
				password: validation.data.password,
				code: validation.data.code,
			});

			if (!result.deleted) {
				return res.status(400).json({
					status: false,
					message: 'Unable to delete account',
				});
			}

			res.locals.authEventUserId = userId;

			res.locals.authEventMetadata = {
				sessionsDeleted: result.sessionsDeleted,

				secondFactorMethod: result.secondFactorMethod,
			};

			await destroySession(req.session);

			res.clearCookie(sessionCookieName, {
				httpOnly: true,
				secure: appEnvironment === 'production',
				sameSite: 'lax',
				path: '/',
			});

			return res.json({
				status: true,
				message: 'Account deleted successfully',
			});
		} catch (error) {
			return next(error);
		}
	};
}
