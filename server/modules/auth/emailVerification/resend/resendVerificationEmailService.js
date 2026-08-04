import { createHash, randomBytes } from 'node:crypto';
export default function createResendVerificationEmailService({ emailVerificationRepository, withConnection }, mailService) {
	const authRepository = { ...emailVerificationRepository, withConnection };
	return async function resendVerificationEmail(email) {
		const result = await authRepository.withConnection(async (connection) => {
			try {
				const user = await authRepository.findPendingUnverifiedUserByEmail(email, connection);

				if (!user) {
					return {
						sent: false,
					};
				}

				const verificationToken = randomBytes(32).toString('hex');

				const verificationTokenHash = createHash('sha256').update(verificationToken).digest();

				await connection.beginTransaction();

				await authRepository.deleteUnusedEmailVerificationTokens(user.id, connection);

				await authRepository.createEmailVerificationToken(user.id, verificationTokenHash, connection);

				await connection.commit();

				return {
					displayName: user.display_name,
					sent: true,
					verificationToken,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});

		if (!result.sent) {
			return result;
		}

		await mailService?.sendAccountVerification({
			displayName: result.displayName,
			email,
			token: result.verificationToken,
		});

		return { sent: true };
	};
}
