import {
	totpCodeSchema,
} from '#server/modules/auth/authSchemas';

export default function createEnableTotpController(
	enableTotpService,
) {
	return async function enableTotp(req, res, next) {
		const validation = totpCodeSchema.safeParse(
			req.body,
		);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid authentication code',
			});
		}

		try {
			const result = await enableTotpService({
				userId: req.auth.user.id,
				code: validation.data.code,
			});

			if (!result.enabled) {
				return res.status(400).json({
					status: false,
					message:
						'Invalid authentication code or TOTP setup',
				});
			}

			return res.json({
				status: true,
				message:
					'Two-factor authentication enabled',
				data: {
					recoveryCodes:
						result.recoveryCodes,
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}