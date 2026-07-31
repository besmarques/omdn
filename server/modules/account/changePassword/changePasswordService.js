import argon2 from 'argon2';

const argonOptions = {
	type: argon2.argon2id,
	memoryCost: 19456,
	timeCost: 2,
	parallelism: 1,
};

export default function createChangePasswordService(authRepository) {
	return async function changePassword({ userId, currentPassword, newPassword, currentSessionId }) {
		if (!currentSessionId) {
			throw new Error('Current session identifier is unavailable');
		}

		if (currentPassword === newPassword) {
			return {
				changed: false,
			};
		}

		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const user = await authRepository.findActiveUserPasswordByIdForUpdate(userId, connection);

				if (!user?.password_hash) {
					await connection.rollback();

					return {
						changed: false,
					};
				}

				const currentPasswordIsValid = await argon2.verify(user.password_hash, currentPassword);

				if (!currentPasswordIsValid) {
					await connection.rollback();

					return {
						changed: false,
					};
				}

				const passwordHash = await argon2.hash(newPassword, argonOptions);

				await authRepository.updateUserPassword(userId, passwordHash, connection);

				const revokedSessions = await authRepository.deleteOtherUserSessions(userId, currentSessionId, connection);

				await connection.commit();

				return {
					changed: true,
					revokedSessions,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
