export default function createSetupTotpController(setupTotpService) {
	return async function setupTotp(req, res, next) {
		try {
			const result = await setupTotpService({
				userId: req.auth.user.id,
				email: req.auth.user.email,
			});

			if (!result.created) {
				return res.status(409).json({
					status: false,
					message: 'Two-factor authentication is already enabled',
				});
			}

			return res.json({
				status: true,
				message: 'Scan the QR code and confirm with your authenticator code',
				data: {
					secret: result.secret,
					qrCode: result.qrCode,
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}
