import { Buffer } from 'node:buffer';

import { decryptTotpSecret, encryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

export default function createTotpEncryption(encryptionKey) {
	if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32) {
		throw new Error('TOTP encryption key must contain exactly 32 bytes');
	}

	return Object.freeze({
		encryptTotpSecret(secret, userId) {
			return encryptTotpSecret(secret, userId, encryptionKey);
		},
		decryptTotpSecret(encryptedSecret, userId) {
			return decryptTotpSecret(encryptedSecret, userId, encryptionKey);
		},
	});
}
