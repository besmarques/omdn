import { Buffer } from 'node:buffer';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import process from 'node:process';

const algorithm = 'aes-256-gcm';
const version = 'v1';

function getEncryptionKey() {
	const encodedKey = process.env.TOTP_ENCRYPTION_KEY;

	if (!encodedKey) {
		throw new Error('TOTP_ENCRYPTION_KEY is not configured');
	}

	const key = Buffer.from(encodedKey, 'base64');

	if (key.length !== 32) {
		throw new Error('TOTP_ENCRYPTION_KEY must be a Base64-encoded 32-byte key');
	}

	return key;
}

function createAdditionalData(userId) {
	return Buffer.from(`omdn:user-totp:${userId}`, 'utf8');
}

export function encryptTotpSecret(secret, userId) {
	const initializationVector = randomBytes(12);

	const cipher = createCipheriv(algorithm, getEncryptionKey(), initializationVector);

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

export function decryptTotpSecret(encryptedSecret, userId) {
	const [storedVersion, initializationVectorValue, authenticationTagValue, encryptedValue] = String(encryptedSecret).split('.');

	if (storedVersion !== version || !initializationVectorValue || !authenticationTagValue || !encryptedValue) {
		throw new Error('Invalid encrypted TOTP secret');
	}

	const initializationVector = Buffer.from(initializationVectorValue, 'base64url');

	const authenticationTag = Buffer.from(authenticationTagValue, 'base64url');

	const encrypted = Buffer.from(encryptedValue, 'base64url');

	const decipher = createDecipheriv(algorithm, getEncryptionKey(), initializationVector);

	decipher.setAAD(createAdditionalData(userId));
	decipher.setAuthTag(authenticationTag);

	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
