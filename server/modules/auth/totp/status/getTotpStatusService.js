export default function createGetTotpStatusService(dependencies) {
	const authRepository = dependencies.totpRepository;
	return async function getTotpStatus(userId) {
		const totp = await authRepository.findTotpByUserId(userId);

		return {
			enabled: Boolean(totp?.is_enabled),
		};
	};
}
