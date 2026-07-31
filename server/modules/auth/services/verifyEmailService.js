import { createHash } from 'node:crypto';

export default function createVerifyEmailService(authRepository) {
	return async function verifyEmail(token) {
		const tokenHash = createHash('sha256')
			.update(token)
			.digest();

		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const verification =
					await authRepository.findValidEmailVerificationByTokenHash(
						tokenHash,
						connection,
					);

				if (
					!verification ||
					!['pending', 'active'].includes(
						verification.status,
					)
				) {
					await connection.rollback();

					return {
						verified: false,
					};
				}

				await authRepository.activateVerifiedUser(
					verification.user_id,
					connection,
				);

				await authRepository.markEmailVerificationTokensUsed(
					verification.user_id,
					connection,
				);

				await connection.commit();

				return {
					verified: true,
					userId: verification.user_id,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}