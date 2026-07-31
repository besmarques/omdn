export default function createGetCurrentAccountController(getCurrentAccountService) {
	return function getCurrentAccount(req, res) {
		const account = getCurrentAccountService(req.auth);

		return res.json({
			status: true,
			data: account,
		});
	};
}
