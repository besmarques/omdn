import { resetPasswordSchema } from '#server/modules/auth/authSchemas';

export default function createResetPasswordController(
	resetPasswordService,
) {
	return async function resetPassword(req, res, next) {
		const validation = resetPasswordSchema.safeParse(
			req.body,
		);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid password reset data',
				errors:
					validation.error.flatten().fieldErrors,
			});
		}

		try {
			const result = await resetPasswordService(
				validation.data,
			);

			if (!result.reset) {
				return res.status(400).json({
					status: false,
					message:
						'Invalid or expired password reset token',
				});
			}

			return res.json({
				status: true,
				message: 'Password reset successfully',
			});
		} catch (error) {
			return next(error);
		}
	};
}