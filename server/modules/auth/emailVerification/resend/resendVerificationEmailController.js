const resendResponse = {
	status: true,
	message: 'If the account exists and still requires verification, a new email will be sent.',
};

export default function createResendVerificationEmailController(resendVerificationEmailService) {
	return async function resendVerificationEmail(req, res, next) {
		const email = String(req.body.email ?? '')
			.trim()
			.toLowerCase();

		if (!email) {
			return res.json(resendResponse);
		}

		try {
			await resendVerificationEmailService(email);

			return res.json(resendResponse);
		} catch (error) {
			return next(error);
		}
	};
}
