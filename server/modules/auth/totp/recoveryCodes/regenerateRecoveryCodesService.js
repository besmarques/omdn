import { verify } from 'otplib';

import { decryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

import { generateRecoveryCodes, hashRecoveryCode } from '#server/modules/auth/totp/shared/recoveryCodes';

export default function createRegenerateRecoveryCodesService(authRepository, decryptSecret = decryptTotpSecret) {
	return async function regenerateRecoveryCodes({ userId, code }) {
		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const totp = await authRepository.findTotpByUserIdForUpdate(userId, connection);

				if (!totp?.is_enabled) {
					await connection.rollback();

					return {
						regenerated: false,
					};
				}

				const secret = decryptSecret(totp.secret_encrypted, userId);

				const period = Number(totp.period);

				const verificationOptions = {
					secret,
					token: code,
					algorithm: String(totp.algorithm).toLowerCase(),
					digits: Number(totp.digits),
					period,
					epochTolerance: period,
				};

				const lastUsedStep = Number(totp.last_used_step);

				if (Number.isSafeInteger(lastUsedStep) && lastUsedStep >= 0) {
					verificationOptions.afterTimeStep = lastUsedStep;
				}

				const verification = await verify(verificationOptions);

				if (!verification.valid || !Number.isSafeInteger(verification.timeStep)) {
					await connection.rollback();

					return {
						regenerated: false,
					};
				}

				const updatedRows = await authRepository.updateTotpLastUsedStep(userId, verification.timeStep, connection);

				if (updatedRows !== 1) {
					await connection.rollback();

					return {
						regenerated: false,
					};
				}

				const recoveryCodes = generateRecoveryCodes();

				const recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);

				await authRepository.replaceRecoveryCodes(userId, recoveryCodeHashes, connection);

				await connection.commit();

				return {
					regenerated: true,
					recoveryCodes,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
