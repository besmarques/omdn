import { totpCodeSchema } from '#server/modules/auth/shared/authSchemas';

export default function createRegenerateRecoveryCodesController(regenerateRecoveryCodesService) {
	return async function regenerateRecoveryCodes(req, res, next) {
		const validation = totpCodeSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid authentication code',
			});
		}

		try {
			const result = await regenerateRecoveryCodesService({
				userId: req.auth.user.id,
				code: validation.data.code,
				currentSessionId: req.sessionID,
			});

			if (!result.regenerated) {
				return res.status(400).json({
					status: false,
					message: 'Invalid authentication code or TOTP is not enabled',
				});
			}

			return res.json({
				status: true,
				message: 'Recovery codes regenerated',
				data: {
					recoveryCodes: result.recoveryCodes,
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}
