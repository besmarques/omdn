import { createHash } from 'node:crypto';

import argon2 from 'argon2';

const argonOptions = {
	type: argon2.argon2id,
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1,
};

export default function createResetPasswordService({
	credentialsRepository,
	passwordRecoveryRepository,
	sessionRepository,
	withConnection,
}) {
	const authRepository = {
		...credentialsRepository,
		...passwordRecoveryRepository,
		...sessionRepository,
		withConnection,
	};
	return async function resetPassword({ token, password }) {
		const tokenHash = createHash('sha256').update(token).digest();
		const passwordResetPreflight = await authRepository.findValidPasswordResetByTokenHash(tokenHash);

		if (!passwordResetPreflight) {
			return {
				reset: false,
			};
		}

		const passwordHash = await argon2.hash(password, argonOptions);

		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const passwordReset = await authRepository.findValidPasswordResetByTokenHashForUpdate(tokenHash, connection);

				if (!passwordReset) {
					await connection.rollback();

					return {
						reset: false,
					};
				}

				await authRepository.updateUserPassword(passwordReset.user_id, passwordHash, connection);

				await authRepository.markPasswordResetTokensUsed(passwordReset.user_id, connection);

				await authRepository.deleteUserSessions(passwordReset.user_id, connection);

				await connection.commit();

				return {
					reset: true,
					userId: passwordReset.user_id,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
