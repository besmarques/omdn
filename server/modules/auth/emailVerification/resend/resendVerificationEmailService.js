import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';

export default function createResendVerificationEmailService(authRepository) {
	return async function resendVerificationEmail(email) {
		return authRepository.withConnection(async (connection) => {
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

				if (process.env.APP_ENV === 'development') {
					console.log(`New verification token for ${email}: ${verificationToken}`);
				}

				return {
					sent: true,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
