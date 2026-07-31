export default function createGetTotpStatusService(authRepository) {
	return async function getTotpStatus(userId) {
		const totp = await authRepository.findTotpByUserId(userId);

		return {
			enabled: Boolean(totp?.is_enabled),
		};
	};
}
