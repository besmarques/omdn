import { loginSchema } from '#server/modules/auth/authSchemas';

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

			const { user } = authentication;

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
						await loginService.recordSuccessfulLogin(user.id);

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
	};
}
