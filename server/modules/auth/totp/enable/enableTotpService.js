import { verify } from 'otplib';

import { decryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

import { generateRecoveryCodes, hashRecoveryCode } from '#server/modules/auth/totp/shared/recoveryCodes';

export default function createEnableTotpService(dependencies, decryptSecret = decryptTotpSecret) {
	const authRepository = {
		...dependencies.sessionRepository,
		...dependencies.totpRepository,
		withConnection: dependencies.withConnection,
	};
	return async function enableTotp({ userId, code, currentSessionId }) {
		if (!currentSessionId) {
			throw new Error('Current session identifier is unavailable');
		}
		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const totp = await authRepository.findTotpByUserIdForUpdate(userId, connection);

				if (!totp || totp.is_enabled) {
					await connection.rollback();

					return {
						enabled: false,
					};
				}

				const secret = decryptSecret(totp.secret_encrypted, userId);

				const period = Number(totp.period);

				const verification = await verify({
					secret,
					token: code,
					algorithm: String(totp.algorithm).toLowerCase(),
					digits: Number(totp.digits),
					period,
					epochTolerance: period,
				});

				if (!verification.valid || verification.epoch === undefined) {
					await connection.rollback();

					return {
						enabled: false,
					};
				}

				const matchedStep = verification.timeStep;

				const recoveryCodes = generateRecoveryCodes();

				const recoveryCodeHashes = recoveryCodes.map(hashRecoveryCode);

				await authRepository.replaceRecoveryCodes(userId, recoveryCodeHashes, connection);

				const affectedRows = await authRepository.enableTotp(userId, matchedStep, connection);

				if (affectedRows !== 1) {
					throw new Error('Unable to enable TOTP');
				}

				await authRepository.deleteOtherUserSessions(userId, currentSessionId, connection);

				await connection.commit();

				return {
					enabled: true,
					recoveryCodes,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
