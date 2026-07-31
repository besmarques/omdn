import {
	createHash,
	randomBytes,
} from 'node:crypto';

const recoveryCodeCount = 10;
const recoveryCodeBytes = 10;

export function normalizeRecoveryCode(code) {
	return String(code)
		.replaceAll(/[^a-zA-Z0-9]/g, '')
		.toUpperCase();
}

export function hashRecoveryCode(code) {
	return createHash('sha256')
		.update(normalizeRecoveryCode(code))
		.digest('hex');
}

function formatRecoveryCode(value) {
	return value
		.match(/.{1,4}/g)
		.join('-');
}

export function generateRecoveryCodes() {
	return Array.from(
		{
			length: recoveryCodeCount,
		},
		() => {
			const value = randomBytes(
				recoveryCodeBytes,
			)
				.toString('hex')
				.toUpperCase();

			return formatRecoveryCode(value);
		},
	);
}