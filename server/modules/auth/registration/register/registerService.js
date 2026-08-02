import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';

export default function createRegisterService(
	{ emailVerificationRepository, registrationRepository, withConnection },
	appEnvironment = 'test',
) {
	const authRepository = { ...emailVerificationRepository, ...registrationRepository, withConnection };
	return async function register({ displayName, email, password }) {
		return authRepository.withConnection(async (connection) => {
			try {
				const existingUser = await authRepository.findExistingUserByEmail(email, connection);

				if (existingUser) {
					return {
						created: false,
					};
				}

				const passwordHash = await argon2.hash(password, {
					type: argon2.argon2id,
					memoryCost: 19456,
					timeCost: 2,
					parallelism: 1,
				});

				const verificationToken = randomBytes(32).toString('hex');

				const verificationTokenHash = createHash('sha256').update(verificationToken).digest();

				await connection.beginTransaction();

				const userId = await authRepository.createPendingUser(
					{
						email,
						displayName,
						passwordHash,
					},
					connection,
				);

				const assignedRoles = await authRepository.assignSubscriberRole(userId, connection);

				if (assignedRoles !== 1) {
					throw new Error('Subscriber role is not configured');
				}

				await authRepository.createEmailVerificationToken(userId, verificationTokenHash, connection);

				await connection.commit();

				if (appEnvironment === 'development') {
					console.log(`Verification token for ${email}: ${verificationToken}`);
				}

				return {
					created: true,
					userId,
				};
			} catch (error) {
				await connection.rollback();

				if (error.code === 'ER_DUP_ENTRY') {
					return {
						created: false,
					};
				}

				throw error;
			}
		});
	};
}
