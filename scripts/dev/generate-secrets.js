import { randomBytes } from 'node:crypto';

const sessionSecret = randomBytes(64).toString('base64url');
const totpEncryptionKey = randomBytes(32).toString('base64');

console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`TOTP_ENCRYPTION_KEY=${totpEncryptionKey}`);
