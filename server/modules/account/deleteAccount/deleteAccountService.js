import argon2 from 'argon2';
import { verify } from 'otplib';

import { decryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

import { hashRecoveryCode } from '#server/modules/auth/totp/shared/recoveryCodes';

function isTotpCode(code) {
	return /^\d{6}$/.test(code);
}

async function verifyTotpCode({ userId, code, totp }) {
	const secret = decryptTotpSecret(totp.secret_encrypted, userId);

	const options = {
		secret,
		token: code,
		algorithm: String(totp.algorithm).toLowerCase(),
		digits: Number(totp.digits),
		period: Number(totp.period),
		epochTolerance: Number(totp.period),
	};

	const lastUsedStep = Number(totp.last_used_step);

	if (Number.isSafeInteger(lastUsedStep) && lastUsedStep >= 0) {
		options.afterTimeStep = lastUsedStep;
	}

	const verification = await verify(options);

	return Boolean(verification.valid);
}

async function verifyRecoveryCode({ userId, code, connection, deleteAccountRepository }) {
	const codeHash = hashRecoveryCode(code);

	const recoveryCode = await deleteAccountRepository.findUnusedRecoveryCodeForUpdate(userId, codeHash, connection);

	return Boolean(recoveryCode);
}

export default function createDeleteAccountService(deleteAccountRepository) {
	return async function deleteAccount({ userId, password, code }) {
		return deleteAccountRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const user = await deleteAccountRepository.findActiveUserForUpdate(userId, connection);

				if (!user?.password_hash) {
					await connection.rollback();

					return {
						deleted: false,
					};
				}

				const passwordIsValid = await argon2.verify(user.password_hash, password);

				if (!passwordIsValid) {
					await connection.rollback();

					return {
						deleted: false,
					};
				}

				const totp = await deleteAccountRepository.findTotpForUpdate(userId, connection);

				let secondFactorMethod = null;

				if (totp?.is_enabled) {
					if (!code) {
						await connection.rollback();

						return {
							deleted: false,
						};
					}

					secondFactorMethod = isTotpCode(code) ? 'totp' : 'recovery_code';

					const secondFactorIsValid =
						secondFactorMethod === 'totp'
							? await verifyTotpCode({
									userId,
									code,
									totp,
								})
							: await verifyRecoveryCode({
									userId,
									code,
									connection,
									deleteAccountRepository,
								});

					if (!secondFactorIsValid) {
						await connection.rollback();

						return {
							deleted: false,
						};
					}
				}

				await deleteAccountRepository.deleteEmailVerificationTokens(userId, connection);

				await deleteAccountRepository.deletePasswordResetTokens(userId, connection);

				await deleteAccountRepository.deleteAuthIdentities(userId, connection);

				await deleteAccountRepository.deleteRecoveryCodes(userId, connection);

				await deleteAccountRepository.deleteTotp(userId, connection);

				const affectedRows = await deleteAccountRepository.softDeleteUser(userId, connection);

				if (affectedRows !== 1) {
					throw new Error('Unable to delete account');
				}

				const sessionsDeleted = await deleteAccountRepository.deleteUserSessions(userId, connection);

				await connection.commit();

				return {
					deleted: true,
					secondFactorMethod,
					sessionsDeleted,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
