import { disableTotpSchema } from '#server/modules/auth/shared/authSchemas';

export default function createDisableTotpController(disableTotpService) {
	return async function disableTotp(req, res, next) {
		const validation = disableTotpSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid two-factor authentication data',
				errors: validation.error.flatten().fieldErrors,
			});
		}

		try {
			const result = await disableTotpService({
				userId: req.auth.user.id,
				password: validation.data.password,
				code: validation.data.code,
				currentSessionId: req.sessionID,
			});

			if (!result.disabled) {
				return res.status(400).json({
					status: false,
					message: 'Unable to disable two-factor authentication',
				});
			}

			return res.json({
				status: true,
				message: 'Two-factor authentication disabled',
			});
		} catch (error) {
			return next(error);
		}
	};
}
