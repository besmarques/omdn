import { Buffer } from 'node:buffer';

import { describe, expect, it } from 'vitest';

import createTotpEncryption from '#server/modules/auth/totp/shared/createTotpEncryption';

describe('TOTP encryption configuration', () => {
	it('binds the validated startup key for encryption and decryption', () => {
		const encryption = createTotpEncryption(Buffer.alloc(32, 9));

		const encrypted = encryption.encryptTotpSecret('BASE32SECRET', 42);

		expect(encryption.decryptTotpSecret(encrypted, 42)).toBe('BASE32SECRET');
	});

	it('rejects a key that is not exactly 32 bytes', () => {
		expect(() => createTotpEncryption(Buffer.alloc(31))).toThrow('TOTP encryption key must contain exactly 32 bytes');
	});

	it('keeps ciphertext bound to its user ID', () => {
		const encryption = createTotpEncryption(Buffer.alloc(32, 9));
		const encrypted = encryption.encryptTotpSecret('BASE32SECRET', 42);

		expect(() => encryption.decryptTotpSecret(encrypted, 77)).toThrow();
	});
});
