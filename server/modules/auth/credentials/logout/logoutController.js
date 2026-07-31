import process from 'node:process';

const sessionCookieName = 'omdn_session';

export default function createLogoutController(logoutService) {
	return async function logout(req, res, next) {
		try {
			await logoutService(req.session);

			res.clearCookie(sessionCookieName, {
				httpOnly: true,
				secure: process.env.APP_ENV === 'production',
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
