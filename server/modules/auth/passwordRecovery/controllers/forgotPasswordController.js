import { forgotPasswordSchema } from '#server/modules/auth/authSchemas';

const forgotPasswordResponse = {
	status: true,
	message:
		'If the account exists, a password reset email will be sent.',
};

export default function createForgotPasswordController(
	forgotPasswordService,
) {
	return async function forgotPassword(req, res, next) {
		const validation = forgotPasswordSchema.safeParse(
			req.body,
		);

		if (!validation.success) {
			return res.json(forgotPasswordResponse);
		}

		try {
			await forgotPasswordService(
				validation.data.email,
			);

			return res.json(forgotPasswordResponse);
		} catch (error) {
			return next(error);
		}
	};
}