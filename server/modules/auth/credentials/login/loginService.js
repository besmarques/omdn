import argon2 from 'argon2';

export default function createLoginService({ credentialsRepository, sessionRepository, totpRepository, withConnection }) {
	const authRepository = { ...credentialsRepository, ...sessionRepository, ...totpRepository, withConnection };
	async function authenticateWithPassword(email, password) {
		const user = await authRepository.findUserByEmail(email);

		if (!user || !user.password_hash) {
			return {
				success: false,
				code: 'INVALID_CREDENTIALS',
			};
		}

		const passwordIsValid = await argon2.verify(user.password_hash, password);

		if (!passwordIsValid) {
			return {
				success: false,
				code: 'INVALID_CREDENTIALS',
			};
		}

		if (user.status === 'pending' || !user.email_verified_at) {
			return {
				success: false,
				code: 'EMAIL_VERIFICATION_REQUIRED',
			};
		}

		if (user.status !== 'active') {
			return {
				success: false,
				code: 'ACCOUNT_UNAVAILABLE',
			};
		}

		const totp = await authRepository.findTotpByUserId(user.id);

		return {
			success: true,
			user,
			requiresTwoFactor: Boolean(totp?.is_enabled),
		};
	}

	async function recordSuccessfulLogin({ userId, currentSessionId }) {
		if (!currentSessionId) {
			throw new Error('Current session identifier is unavailable');
		}

		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();
				await authRepository.deleteOtherUserSessions(userId, currentSessionId, connection);
				await authRepository.updateLastLogin(userId, connection);
				await connection.commit();
			} catch (error) {
				await connection.rollback();
				throw error;
			}
		});
	}

	return {
		authenticateWithPassword,
		recordSuccessfulLogin,
	};
}
