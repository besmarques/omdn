import {
	emailVerificationSchema,
} from '#server/modules/auth/shared/authSchemas';

export default function createVerifyEmailController(
	verifyEmailService,
) {
	return async function verifyEmail(
		req,
		res,
		next,
	) {
		const validation =
			emailVerificationSchema.safeParse(
				req.body,
			);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message:
					'Invalid or expired verification token',
			});
		}

		try {
			const result =
				await verifyEmailService(
					validation.data.token,
				);

			if (!result.verified) {
				return res.status(400).json({
					status: false,
					message:
						'Invalid or expired verification token',
				});
			}

			res.locals.authEventUserId =
				result.userId;

			return res.json({
				status: true,
				message:
					'Email verified successfully',
			});
		} catch (error) {
			return next(error);
		}
	};
}