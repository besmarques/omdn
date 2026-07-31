import { verify } from 'otplib';

import {
	decryptTotpSecret,
} from '#server/modules/auth/totp/utils/totpEncryption';

import {
	generateRecoveryCodes,
	hashRecoveryCode,
} from '#server/modules/auth/totp/utils/recoveryCodes';

export default function createEnableTotpService(
	authRepository,
) {
	return async function enableTotp({
		userId,
		code,
	}) {
		return authRepository.withConnection(
			async (connection) => {
				try {
					await connection.beginTransaction();

					const totp =
						await authRepository.findTotpByUserIdForUpdate(
							userId,
							connection,
						);

					if (!totp || totp.is_enabled) {
						await connection.rollback();

						return {
							enabled: false,
						};
					}

					const secret = decryptTotpSecret(
						totp.secret_encrypted,
						userId,
					);

					const period = Number(totp.period);

					const verification = await verify({
						secret,
						token: code,
						algorithm: String(
							totp.algorithm,
						).toLowerCase(),
						digits: Number(totp.digits),
						period,
						epochTolerance: period,
					});

					if (
						!verification.valid ||
						verification.epoch === undefined
					) {
						await connection.rollback();

						return {
							enabled: false,
						};
					}

					const matchedStep = verification.timeStep;

					const recoveryCodes =
						generateRecoveryCodes();

					const recoveryCodeHashes =
						recoveryCodes.map(
							hashRecoveryCode,
						);

					await authRepository.replaceRecoveryCodes(
						userId,
						recoveryCodeHashes,
						connection,
					);

					const affectedRows =
						await authRepository.enableTotp(
							userId,
							matchedStep,
							connection,
						);

					if (affectedRows !== 1) {
						throw new Error(
							'Unable to enable TOTP',
						);
					}

					await connection.commit();

					return {
						enabled: true,
						recoveryCodes,
					};
				} catch (error) {
					await connection.rollback();

					throw error;
				}
			},
		);
	};
}