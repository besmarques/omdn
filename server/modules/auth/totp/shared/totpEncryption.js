import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const algorithm = 'aes-256-gcm';
const version = 'v1';

function validateEncryptionKey(key) {
	if (!Buffer.isBuffer(key) || key.length !== 32) {
		throw new Error('TOTP encryption key must contain exactly 32 bytes');
	}

	return key;
}

function createAdditionalData(userId) {
	return Buffer.from(`omdn:user-totp:${userId}`, 'utf8');
}

export function encryptTotpSecret(secret, userId, encryptionKey) {
	const key = validateEncryptionKey(encryptionKey);
	const initializationVector = randomBytes(12);
	const cipher = createCipheriv(algorithm, key, initializationVector);

	cipher.setAAD(createAdditionalData(userId));

	const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
	const authenticationTag = cipher.getAuthTag();

	return [
		version,
		initializationVector.toString('base64url'),
		authenticationTag.toString('base64url'),
		encrypted.toString('base64url'),
	].join('.');
}

export function decryptTotpSecret(encryptedSecret, userId, encryptionKey) {
	const key = validateEncryptionKey(encryptionKey);
	const [storedVersion, initializationVectorValue, authenticationTagValue, encryptedValue] = String(encryptedSecret).split('.');

	if (storedVersion !== version || !initializationVectorValue || !authenticationTagValue || !encryptedValue) {
		throw new Error('Invalid encrypted TOTP secret');
	}

	const initializationVector = Buffer.from(initializationVectorValue, 'base64url');
	const authenticationTag = Buffer.from(authenticationTagValue, 'base64url');
	const encrypted = Buffer.from(encryptedValue, 'base64url');
	const decipher = createDecipheriv(algorithm, key, initializationVector);

	decipher.setAAD(createAdditionalData(userId));
	decipher.setAuthTag(authenticationTag);

	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
