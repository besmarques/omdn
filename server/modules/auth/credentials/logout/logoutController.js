const sessionCookieName = 'omdn_session';

export default function createLogoutController(logoutService, appEnvironment = 'test') {
	return async function logout(req, res, next) {
		try {
			await logoutService(req.session);

			res.clearCookie(sessionCookieName, {
				httpOnly: true,
				secure: appEnvironment === 'production',
				sameSite: 'lax',
				path: '/',
			});

			return res.json({
				status: true,
				message: 'Logout successful',
			});
		} catch (error) {
			return next(error);
		}
	};
}
