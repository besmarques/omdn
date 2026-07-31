import { generateSecret, generateURI } from 'otplib';

import QRCode from 'qrcode';

import { encryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

const issuer = 'O Melhor do Natal';

export default function createSetupTotpService(authRepository) {
	return async function setupTotp({ userId, email }) {
		const secret = generateSecret();

		const uri = generateURI({
			issuer,
			label: email,
			secret,
			algorithm: 'sha1',
			digits: 6,
			period: 30,
		});

		const qrCode = await QRCode.toDataURL(uri, {
			errorCorrectionLevel: 'M',
			margin: 2,
			width: 320,
		});

		const secretEncrypted = encryptTotpSecret(secret, userId);

		return authRepository.withConnection(async (connection) => {
			try {
				await connection.beginTransaction();

				const existingTotp = await authRepository.findTotpByUserIdForUpdate(userId, connection);

				if (existingTotp?.is_enabled) {
					await connection.rollback();

					return {
						created: false,
						code: 'TOTP_ALREADY_ENABLED',
					};
				}

				await authRepository.savePendingTotp(userId, secretEncrypted, connection);

				await connection.commit();

				return {
					created: true,
					secret,
					qrCode,
				};
			} catch (error) {
				await connection.rollback();

				throw error;
			}
		});
	};
}
