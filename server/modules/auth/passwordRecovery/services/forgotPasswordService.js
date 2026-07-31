import { createHash, randomBytes } from 'node:crypto';
import process from 'node:process';

export default function createForgotPasswordService(
	authRepository,
) {
	return async function forgotPassword(email) {
		return authRepository.withConnection(
			async (connection) => {
				try {
					const user =
						await authRepository.findPasswordResetUserByEmail(
							email,
							connection,
						);

					if (!user) {
						return {
							sent: false,
						};
					}

					const resetToken = randomBytes(32).toString(
						'hex',
					);

					const resetTokenHash = createHash('sha256')
						.update(resetToken)
						.digest();

					await connection.beginTransaction();

					await authRepository.deleteUnusedPasswordResetTokens(
						user.id,
						connection,
					);

					await authRepository.createPasswordResetToken(
						user.id,
						resetTokenHash,
						connection,
					);

					await connection.commit();

					if (
						process.env.APP_ENV ===
						'development'
					) {
						console.log(
							`Password reset token for ${email}: ${resetToken}`,
						);
					}

					return {
						sent: true,
					};
				} catch (error) {
					await connection.rollback();

					throw error;
				}
			},
		);
	};
}