export default function createGetTotpStatusController(
	getTotpStatusService,
) {
	return async function getTotpStatus(req, res, next) {
		try {
			const result = await getTotpStatusService(
				req.auth.user.id,
			);

			return res.json({
				status: true,
				data: {
					enabled: result.enabled,
				},
			});
		} catch (error) {
			return next(error);
		}
	};
}