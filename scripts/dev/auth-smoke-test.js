import { spawn, spawnSync } from 'node:child_process';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:net';
import process from 'node:process';

import mysql from 'mysql2/promise';

let port = Number(process.env.PORT ?? 3000);
let baseUrl = `http://127.0.0.1:${port}`;

const sleep = (milliseconds) =>
	new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});

function getEnvironmentValue(names) {
	for (const name of names) {
		const value = process.env[name];

		if (typeof value === 'string' && value.trim() !== '') {
			return value.trim();
		}
	}

	throw new Error(`Missing environment variable. Expected one of: ${names.join(', ')}`);
}

const successfulRateLimitPaths = new Set([
	'/api/auth/login',
	'/api/auth/password/reset',
	'/api/auth/totp/login/verify',
	'/api/auth/totp/recovery-codes/regenerate',
	'/api/auth/totp/disable',
	'/api/account/password/change',
	'/api/account',
]);

const rateLimitSettlementDelayMs = 1000;

const protectedOperationRateLimitNamespaces = [
	'auth-password-reset-ip',
	'auth-password-reset-token',
	'auth-totp-disable-ip',
	'auth-totp-disable-user',
	'auth-recovery-codes-regenerate-ip',
	'auth-recovery-codes-regenerate-user',
	'account-delete-ip',
	'account-delete-user',
];

function createDatabasePool() {
	return mysql.createPool({
		host: getEnvironmentValue(['DB_HOST']),

		port: Number(process.env.DB_PORT ?? 3306),

		database: getEnvironmentValue(['DB_DATABASE', 'DB_NAME']),

		user: getEnvironmentValue(['DB_USER', 'DB_USERNAME']),

		password: getEnvironmentValue(['DB_PASSWORD']),

		connectionLimit: 3,
	});
}

class CookieJar {
	constructor() {
		this.cookies = new Map();
	}

	get header() {
		return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
	}

	update(response) {
		const setCookieHeaders =
			typeof response.headers.getSetCookie === 'function'
				? response.headers.getSetCookie()
				: [response.headers.get('set-cookie')].filter(Boolean);

		for (const header of setCookieHeaders) {
			const [cookiePair] = header.split(';');

			const separator = cookiePair.indexOf('=');

			if (separator < 1) {
				continue;
			}

			const name = cookiePair.slice(0, separator).trim();

			const value = cookiePair.slice(separator + 1).trim();

			const removeCookie = value === '' || /max-age=0/i.test(header) || /expires=Thu,\s*01\s+Jan\s+1970/i.test(header);

			if (removeCookie) {
				this.cookies.delete(name);
			} else {
				this.cookies.set(name, value);
			}
		}
	}
}

const anonymousCookies = new CookieJar();

let serverProcess = null;
let serverOutput = '';

function findAvailablePort(preferredPort) {
	return new Promise((resolve, reject) => {
		const probe = createServer();

		probe.once('error', (error) => {
			if (error.code !== 'EADDRINUSE') {
				reject(error);
				return;
			}

			const fallbackProbe = createServer();

			fallbackProbe.once('error', reject);

			fallbackProbe.listen(0, '127.0.0.1', () => {
				const address = fallbackProbe.address();

				fallbackProbe.close(() => resolve(address.port));
			});
		});

		probe.listen(preferredPort, '127.0.0.1', () => {
			probe.close(() => resolve(preferredPort));
		});
	});
}

async function waitForServer() {
	const deadline = Date.now() + 30000;

	while (Date.now() < deadline) {
		if (serverProcess && serverProcess.exitCode !== null) {
			throw new Error(`The backend exited with code ${serverProcess.exitCode}`);
		}

		try {
			await fetch(`${baseUrl}/api/__smoke_test__`, {
				signal: AbortSignal.timeout(1000),
			});

			return;
		} catch {
			await sleep(250);
		}
	}

	throw new Error(`The backend did not become available at ${baseUrl}`);
}

async function startServer() {
	if (serverProcess) {
		throw new Error('The backend is already running');
	}

	const preferredPort = port;

	port = await findAvailablePort(preferredPort);
	baseUrl = `http://127.0.0.1:${port}`;

	if (port !== preferredPort) {
		console.log(`\nPort ${preferredPort} is already in use; using ${port} for the smoke-test backend.`);
	}

	console.log(`\nStarting the backend at ${baseUrl}...\n`);

	serverProcess = spawn(process.execPath, ['server/server.js'], {
		cwd: process.cwd(),
		env: {
			...process.env,
			APP_ENV: 'development',
			PORT: String(port),
		},
		stdio: ['inherit', 'pipe', 'pipe'],
		windowsHide: true,
	});

	serverProcess.stdout.on('data', (chunk) => {
		const output = chunk.toString();

		serverOutput += output;
		process.stdout.write(output);
	});

	serverProcess.stderr.on('data', (chunk) => {
		process.stderr.write(chunk);
	});

	await waitForServer();

	console.log('\n✓ Backend is ready');
}

async function stopServer() {
	if (!serverProcess) {
		return;
	}

	const processToStop = serverProcess;
	const shutdownOutputStart = serverOutput.length;

	serverProcess = null;

	console.log('\nStopping the backend gracefully...');

	processToStop.kill('SIGTERM');

	const stopped = await Promise.race([once(processToStop, 'exit').then(() => true), sleep(10000).then(() => false)]);

	if (!stopped) {
		console.warn('Graceful shutdown timed out. Forcing shutdown.');

		if (process.platform === 'win32') {
			spawnSync('taskkill', ['/PID', String(processToStop.pid), '/T', '/F'], {
				stdio: 'ignore',
				windowsHide: true,
			});
		} else {
			processToStop.kill('SIGKILL');
		}

		await once(processToStop, 'exit');

		throw new Error('Backend graceful shutdown exceeded 10 seconds');
	}

	const shutdownOutput = serverOutput.slice(shutdownOutputStart);

	if (!shutdownOutput.includes('Shutdown complete')) {
		throw new Error('Backend exited without completing graceful shutdown');
	}

	console.log('✓ Backend stopped');
}

async function requestApiWithoutCsrf({ method, path, body, cookies, additionalHeaders = {} }) {
	const headers = {
		accept: 'application/json',
		...additionalHeaders,
	};

	if (cookies?.header) {
		headers.cookie = cookies.header;
	}

	if (body !== undefined) {
		headers['content-type'] = 'application/json';
	}

	const response = await fetch(`${baseUrl}${path}`, {
		method,
		headers,

		body: body === undefined ? undefined : JSON.stringify(body),

		signal: AbortSignal.timeout(15000),
	});

	cookies?.update(response);

	const text = await response.text();

	let responseBody = null;

	if (text !== '') {
		try {
			responseBody = JSON.parse(text);
		} catch {
			responseBody = text;
		}
	}

	const result = {
		status: response.status,
		body: responseBody,
		headers: response.headers,
	};

	if (response.status < 400 && successfulRateLimitPaths.has(path)) {
		await sleep(rateLimitSettlementDelayMs);
	}

	return result;
}

async function requestApi({ method, path, body, cookies }) {
	const requestCookies = cookies ?? anonymousCookies;
	const normalizedMethod = method.toUpperCase();

	if (!['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod)) {
		const csrfResponse = await requestApiWithoutCsrf({
			method: 'GET',
			path: '/api/auth/csrf',
			cookies: requestCookies,
		});
		const csrfToken = csrfResponse.body?.data?.csrfToken;

		if (csrfResponse.status !== 200 || typeof csrfToken !== 'string') {
			throw new Error(`Unable to obtain CSRF token: ${JSON.stringify(csrfResponse.body)}`);
		}

		return requestApiWithoutCsrf({
			method,
			path,
			body,
			cookies: requestCookies,
			additionalHeaders: {
				'x-csrf-token': csrfToken,
			},
		});
	}

	return requestApiWithoutCsrf({
		method,
		path,
		body,
		cookies: requestCookies,
	});
}

async function verifyCsrfProtection() {
	const cookies = new CookieJar();
	const missingToken = await requestApiWithoutCsrf({
		method: 'POST',
		path: '/api/auth/register',
		cookies,
		body: {},
	});

	expectStatus(missingToken, 403, 'Reject state change without CSRF token');

	const tokenResponse = await requestApiWithoutCsrf({
		method: 'GET',
		path: '/api/auth/csrf',
		cookies,
	});
	const csrfToken = tokenResponse.body?.data?.csrfToken;

	if (tokenResponse.status !== 200 || typeof csrfToken !== 'string') {
		throw new Error(`Unable to obtain CSRF token: ${JSON.stringify(tokenResponse.body)}`);
	}

	const crossSite = await requestApiWithoutCsrf({
		method: 'POST',
		path: '/api/auth/register',
		cookies,
		body: {},
		additionalHeaders: {
			origin: 'https://attacker.example',
			'sec-fetch-site': 'cross-site',
			'x-csrf-token': csrfToken,
		},
	});

	expectStatus(crossSite, 403, 'Reject cross-site state change with a valid CSRF token');
}

function expectStatus(result, expectedStatus, description) {
	const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

	if (!expectedStatuses.includes(result.status)) {
		throw new Error(
			[
				`${description} failed.`,
				`Received HTTP ${result.status}.`,
				`Expected ${expectedStatuses.join(' or ')}.`,
				JSON.stringify(result.body, null, 2),
			].join('\n'),
		);
	}

	console.log(`✓ ${description}: HTTP ${result.status}`);
}

function getResponseValue(body, paths) {
	for (const path of paths) {
		let current = body;

		for (const key of path) {
			current = current?.[key];
		}

		if (current !== undefined && current !== null) {
			return current;
		}
	}

	return null;
}

async function readServerHexToken(description, pattern) {
	const deadline = Date.now() + 5000;

	while (Date.now() < deadline) {
		const match = serverOutput.match(pattern);

		if (match) {
			serverOutput = serverOutput.replace(match[0], '');

			console.log(`✓ Captured ${description} from the development server`);

			return match[1];
		}

		await sleep(50);
	}

	throw new Error(
		`The ${description} was not emitted by the server. Confirm APP_ENV=development and that the registration created a new user.`,
	);
}

function decodeBase32(value) {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

	const normalized = value.toUpperCase().replace(/=+$/u, '').replace(/\s+/gu, '');

	let bits = '';

	for (const character of normalized) {
		const index = alphabet.indexOf(character);

		if (index === -1) {
			throw new Error('Invalid Base32 TOTP secret');
		}

		bits += index.toString(2).padStart(5, '0');
	}

	const bytes = [];

	for (let index = 0; index + 8 <= bits.length; index += 8) {
		bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
	}

	return Buffer.from(bytes);
}

function generateTotp(secret, { algorithm = 'sha1', digits = 6, period = 30 } = {}) {
	const counter = BigInt(Math.floor(Date.now() / 1000 / period));

	const counterBuffer = Buffer.alloc(8);

	counterBuffer.writeBigUInt64BE(counter);

	const digest = createHmac(algorithm.toLowerCase(), decodeBase32(secret)).update(counterBuffer).digest();

	const offset = digest[digest.length - 1] & 0x0f;

	const binary =
		((digest[offset] & 0x7f) << 24) |
		((digest[offset + 1] & 0xff) << 16) |
		((digest[offset + 2] & 0xff) << 8) |
		(digest[offset + 3] & 0xff);

	return String(binary % 10 ** digits).padStart(digits, '0');
}

async function waitForFreshTotp(period = 30) {
	const currentSecond = Math.floor(Date.now() / 1000);

	const secondsRemaining = period - (currentSecond % period) + 1;

	console.log(`Waiting ${secondsRemaining} seconds for a fresh TOTP code...`);

	await sleep(secondsRemaining * 1000);
}

async function databasePreflight(db) {
	const [[version]] = await db.query('SELECT VERSION() AS version');

	console.log(`Database version: ${version.version}`);

	const requiredTables = ['users', 'roles', 'user_roles', 'sessions', 'rate_limit_counters', 'auth_events', 'auth_event_outbox'];

	const [tables] = await db.query(
		`
			SELECT TABLE_NAME
			FROM information_schema.TABLES
			WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME IN (?)
		`,
		[requiredTables],
	);

	const existingTables = new Set(tables.map((table) => table.TABLE_NAME));

	const missingTables = requiredTables.filter((table) => !existingTables.has(table));

	if (missingTables.length > 0) {
		throw new Error(`Missing migrations or tables: ${missingTables.join(', ')}`);
	}

	const [roles] = await db.query(
		`
			SELECT id
			FROM roles
			WHERE slug = 'subscriber'
			LIMIT 1
		`,
	);

	if (roles.length === 0) {
		throw new Error('The subscriber role is missing. Run the database seed first.');
	}

	console.log('✓ Database preflight passed');
}

async function runAttempts({ description, expectedStatuses, request }) {
	for (let index = 0; index < expectedStatuses.length; index += 1) {
		const result = await request();

		expectStatus(result, expectedStatuses[index], `${description} attempt ${index + 1}`);
	}
}

async function readRateLimitCounterKeys(db) {
	const [rows] = await db.query(`
		SELECT
			namespace,
			HEX(key_hash) AS key_hash
		FROM rate_limit_counters
	`);

	return new Set(rows.map((row) => `${row.namespace}:${row.key_hash}`));
}

async function deleteLoopbackOperationRateLimitCounters(db) {
	const loopbackKeyHashes = ['127.0.0.1', '::/56'].map((key) => createHash('sha256').update(key).digest());
	const ipNamespaces = protectedOperationRateLimitNamespaces.filter((namespace) => namespace.endsWith('-ip'));

	const [result] = await db.query(
		`
			DELETE FROM rate_limit_counters
			WHERE namespace IN (?)
				AND key_hash IN (?, ?)
		`,
		[ipNamespaces, ...loopbackKeyHashes],
	);

	if (result.affectedRows > 0) {
		console.log(`✓ ${result.affectedRows} stale localhost operation counters removed`);
	}
}

async function deleteNewRateLimitCounters(db, existingKeys) {
	const [rows] = await db.query(`
		SELECT
			namespace,
			HEX(key_hash) AS key_hash
		FROM rate_limit_counters
	`);

	const createdCounters = rows.filter((row) => !existingKeys.has(`${row.namespace}:${row.key_hash}`));

	for (const counter of createdCounters) {
		await db.execute(
			`
				DELETE FROM rate_limit_counters
				WHERE namespace = ?
					AND key_hash = UNHEX(?)
			`,
			[counter.namespace, counter.key_hash],
		);
	}

	return createdCounters.length;
}

async function expectNewRateLimitNamespaces(db, existingKeys, expectedNamespaces) {
	const [rows] = await db.query(`
		SELECT
			namespace,
			HEX(key_hash) AS key_hash
		FROM rate_limit_counters
	`);

	const createdNamespaces = new Set(
		rows.filter((row) => !existingKeys.has(`${row.namespace}:${row.key_hash}`)).map((row) => row.namespace),
	);

	const missingNamespaces = expectedNamespaces.filter((namespace) => !createdNamespaces.has(namespace));

	if (missingNamespaces.length > 0) {
		throw new Error(`Missing smoke-test rate-limit counters: ${missingNamespaces.join(', ')}`);
	}

	console.log(`✓ Per-user and per-IP counters verified for ${expectedNamespaces.length / 2} protected operations`);
}

async function run() {
	const db = createDatabasePool();

	const uniqueId = `${Date.now()}-${randomUUID().slice(0, 8)}`;

	const email = `real-user-${uniqueId}@example.com`;

	const loginLimitEmail = `login-limit-${uniqueId}@example.com`;

	const registrationLimitEmail = `registration-limit-${uniqueId}@example.com`;

	const initialPassword = 'First-Real-Password-2026!';

	const changedPassword = 'Second-Real-Password-2026!';

	const resetPassword = 'Third-Real-Password-2026!';

	const session1 = new CookieJar();
	const session2 = new CookieJar();
	const session3 = new CookieJar();
	const session4 = new CookieJar();
	const session5 = new CookieJar();
	const session6 = new CookieJar();

	let userId;
	let existingRateLimitCounterKeys;

	console.log('\n========================================');

	console.log('REAL AUTHENTICATION SMOKE TEST');

	console.log('========================================');

	console.log(`Test email: ${email}`);

	try {
		await databasePreflight(db);
		await deleteLoopbackOperationRateLimitCounters(db);
		existingRateLimitCounterKeys = await readRateLimitCounterKeys(db);
		await startServer();
		await verifyCsrfProtection();

		const registration = await requestApi({
			method: 'POST',
			path: '/api/auth/register',

			body: {
				displayName: 'Real Test User',

				email,

				password: initialPassword,
			},
		});

		expectStatus(registration, 202, 'Register real user');

		const verificationToken = await readServerHexToken('email verification token', /Verification token for [^:\r\n]+: ([a-f0-9]{64})/iu);

		const unverifiedLogin = await requestApi({
			method: 'POST',
			path: '/api/auth/login',
			cookies: session1,

			body: {
				email,

				password: initialPassword,
			},
		});

		expectStatus(unverifiedLogin, 403, 'Reject unverified login');

		const verification = await requestApi({
			method: 'POST',
			path: '/api/auth/email/verify',

			body: {
				token: verificationToken,
			},
		});

		expectStatus(verification, 200, 'Verify email');

		const login1 = await requestApi({
			method: 'POST',
			path: '/api/auth/login',
			cookies: session1,

			body: {
				email,

				password: initialPassword,
			},
		});

		expectStatus(login1, 200, 'First login');

		const account1 = await requestApi({
			method: 'GET',
			path: '/api/account/me',
			cookies: session1,
		});

		expectStatus(account1, 200, 'Read authenticated account');

		userId = Number(
			getResponseValue(account1.body, [
				['data', 'user', 'id'],

				['user', 'id'],
			]),
		);

		if (!Number.isSafeInteger(userId) || userId <= 0) {
			throw new Error('Unable to read the user ID from /api/account/me');
		}

		const login2 = await requestApi({
			method: 'POST',
			path: '/api/auth/login',
			cookies: session2,

			body: {
				email,

				password: initialPassword,
			},
		});

		expectStatus(login2, 200, 'Second login');

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session1,
			}),

			401,

			'First session revoked',
		);

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session2,
			}),

			200,

			'Second session remains active',
		);

		const passwordChange = await requestApi({
			method: 'POST',
			path: '/api/account/password/change',

			cookies: session2,

			body: {
				currentPassword: initialPassword,

				newPassword: changedPassword,

				confirmPassword: changedPassword,
			},
		});

		expectStatus(passwordChange, 200, 'Change password');

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session2,
			}),

			200,

			'Current session survives password change',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/login',
				cookies: session3,

				body: {
					email,

					password: initialPassword,
				},
			}),

			401,

			'Old password rejected',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/login',
				cookies: session3,

				body: {
					email,

					password: changedPassword,
				},
			}),

			200,

			'Changed password accepted',
		);

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session2,
			}),

			401,

			'Previous session revoked after new login',
		);

		const forgotPassword = await requestApi({
			method: 'POST',
			path: '/api/auth/password/forgot',

			body: {
				email,
			},
		});

		expectStatus(forgotPassword, 200, 'Request password reset');

		const resetToken = await readServerHexToken('password reset token', /Password reset token for [^:\r\n]+: ([a-f0-9]{64})/iu);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/password/reset',

				body: {
					token: resetToken,

					password: resetPassword,
				},
			}),

			200,

			'Reset password',
		);

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session3,
			}),

			401,

			'Password reset revoked existing session',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/login',
				cookies: session4,

				body: {
					email,

					password: resetPassword,
				},
			}),

			200,

			'Login with reset password',
		);

		const totpSetup = await requestApi({
			method: 'POST',
			path: '/api/auth/totp/setup',

			cookies: session4,
		});

		expectStatus(totpSetup, 200, 'Create TOTP setup');

		const totpSecret = getResponseValue(totpSetup.body, [['data', 'secret'], ['secret'], ['data', 'manualEntryKey']]);

		if (typeof totpSecret !== 'string' || totpSecret.trim() === '') {
			throw new Error('TOTP setup did not return a secret');
		}

		const enableTotp = await requestApi({
			method: 'POST',
			path: '/api/auth/totp/enable',

			cookies: session4,

			body: {
				code: generateTotp(totpSecret),
			},
		});

		expectStatus(enableTotp, 200, 'Enable TOTP');

		const initialRecoveryCodes = getResponseValue(enableTotp.body, [['data', 'recoveryCodes'], ['recoveryCodes']]);

		if (!Array.isArray(initialRecoveryCodes) || initialRecoveryCodes.length === 0) {
			throw new Error('TOTP enable did not return recovery codes');
		}

		await waitForFreshTotp();

		const recoveryCodesRegeneration = await requestApi({
			method: 'POST',
			path: '/api/auth/totp/recovery-codes/regenerate',

			cookies: session4,

			body: {
				code: generateTotp(totpSecret),
			},
		});

		expectStatus(recoveryCodesRegeneration, 200, 'Regenerate recovery codes');

		const recoveryCodes = getResponseValue(recoveryCodesRegeneration.body, [['data', 'recoveryCodes'], ['recoveryCodes']]);

		if (!Array.isArray(recoveryCodes) || recoveryCodes.length === 0) {
			throw new Error('Recovery-code regeneration did not return recovery codes');
		}

		const recoveryCode = recoveryCodes[0];

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/auth/totp/status',

				cookies: session4,
			}),

			200,

			'Read TOTP status',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/logout',
				cookies: session4,
			}),

			200,

			'Logout after TOTP setup',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/login',
				cookies: session5,

				body: {
					email,

					password: resetPassword,
				},
			}),

			202,

			'TOTP login password step',
		);

		await waitForFreshTotp();

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/totp/login/verify',

				cookies: session5,

				body: {
					code: generateTotp(totpSecret),
				},
			}),

			200,

			'Complete TOTP login',
		);

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session5,
			}),

			200,

			'TOTP session authenticated',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/logout',
				cookies: session5,
			}),

			200,

			'Logout after TOTP login',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/login',
				cookies: session6,

				body: {
					email,

					password: resetPassword,
				},
			}),

			202,

			'Recovery-code password step',
		);

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/totp/login/verify',

				cookies: session6,

				body: {
					code: recoveryCode,
				},
			}),

			200,

			'Complete recovery-code login',
		);

		await waitForFreshTotp();

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/totp/disable',

				cookies: session6,

				body: {
					password: resetPassword,

					code: generateTotp(totpSecret),
				},
			}),

			200,

			'Disable TOTP',
		);

		await runAttempts({
			description: 'Recovery-code regeneration rate limit',

			expectedStatuses: [400, 400, 400, 400, 400, 429],

			request: () =>
				requestApi({
					method: 'POST',
					path: '/api/auth/totp/recovery-codes/regenerate',

					cookies: session6,

					body: {
						code: '123456',
					},
				}),
		});

		await runAttempts({
			description: 'TOTP-disable rate limit',

			expectedStatuses: [400, 400, 400, 400, 400, 429],

			request: () =>
				requestApi({
					method: 'POST',
					path: '/api/auth/totp/disable',

					cookies: session6,

					body: {
						password: resetPassword,
						code: '123456',
					},
				}),
		});

		await runAttempts({
			description: 'Login rate limit',

			expectedStatuses: [401, 401, 401, 401, 401, 429],

			request: () =>
				requestApi({
					method: 'POST',
					path: '/api/auth/login',

					body: {
						email: loginLimitEmail,

						password: 'Incorrect-Password-2026!',
					},
				}),
		});

		await stopServer();
		await startServer();

		expectStatus(
			await requestApi({
				method: 'POST',
				path: '/api/auth/login',

				body: {
					email: loginLimitEmail,

					password: 'Incorrect-Password-2026!',
				},
			}),

			429,

			'Login limit survives server restart',
		);

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session6,
			}),

			200,

			'Authenticated session survives server restart',
		);

		await runAttempts({
			description: 'Registration rate limit',

			expectedStatuses: [400, 400, 400, 429],

			request: () =>
				requestApi({
					method: 'POST',
					path: '/api/auth/register',

					body: {
						displayName: 'X',

						email: registrationLimitEmail,

						password: 'short',
					},
				}),
		});

		await runAttempts({
			description: 'Password-change rate limit',

			expectedStatuses: [400, 400, 400, 400, 400, 429],

			request: () =>
				requestApi({
					method: 'POST',
					path: '/api/account/password/change',

					cookies: session6,

					body: {
						currentPassword: 'Wrong-Current-Password-2026!',

						newPassword: 'Unused-New-Password-2026!',

						confirmPassword: 'Unused-New-Password-2026!',
					},
				}),
		});

		await sleep(2000);

		const [[user]] = await db.query(
			`
				SELECT
					id,
					status,
					email_verified_at,
					password_changed_at,
					last_login_at
				FROM users
				WHERE id = ?
			`,
			[userId],
		);

		if (!user || user.status !== 'active' || !user.email_verified_at) {
			throw new Error('The real database user is not active and verified');
		}

		console.log('✓ Real MariaDB user verified');

		const [[sessionCount]] = await db.query(
			`
					SELECT COUNT(*) AS count
					FROM sessions
					WHERE JSON_VALID(data) = 1
						AND CAST(
							JSON_UNQUOTE(
								JSON_EXTRACT(
									data,
									'$.userId'
								)
							)
							AS UNSIGNED
						) = ?
				`,
			[userId],
		);

		if (Number(sessionCount.count) !== 1) {
			throw new Error(`Expected one active session. Found ${sessionCount.count}.`);
		}

		console.log('✓ Single-session policy verified in MariaDB');

		const [[eventCount]] = await db.query(
			`
					SELECT COUNT(*) AS count
					FROM auth_events
					WHERE user_id = ?
				`,
			[userId],
		);

		if (Number(eventCount.count) === 0) {
			throw new Error('No delivered authentication events were found');
		}

		console.log(`✓ ${eventCount.count} authentication events delivered`);

		const [[outbox]] = await db.query(
			`
					SELECT
						COUNT(*) AS total,
						SUM(
							processed_at IS NOT NULL
						) AS processed,
						SUM(
							processed_at IS NULL
						) AS pending
					FROM auth_event_outbox
				`,
		);

		if (Number(outbox.total) === 0 || Number(outbox.processed) === 0) {
			throw new Error('No processed audit-outbox records were found');
		}

		console.log(`✓ Audit outbox: ${outbox.processed} processed, ${outbox.pending ?? 0} pending`);

		const [rateLimitCounters] = await db.query(
			`
					SELECT
						namespace,
						hits,
						reset_at
					FROM rate_limit_counters
					WHERE reset_at >
						CURRENT_TIMESTAMP(3)
				`,
		);

		if (rateLimitCounters.length === 0) {
			throw new Error('No active shared rate-limit counters were found');
		}

		console.log(`✓ ${rateLimitCounters.length} shared rate-limit counters found`);

		await runAttempts({
			description: 'Password-reset rate limit',

			expectedStatuses: [400, 400, 400, 400, 400, 429],

			request: () =>
				requestApi({
					method: 'POST',
					path: '/api/auth/password/reset',

					body: {
						token: 'f'.repeat(64),
						password: 'Invalid-Reset-Password-2026!',
					},
				}),
		});

		await runAttempts({
			description: 'Account-deletion rate limit',

			expectedStatuses: [400, 400, 400, 400, 400, 429],

			request: () =>
				requestApi({
					method: 'DELETE',
					path: '/api/account',

					cookies: session6,

					body: {
						password: 'Wrong-Account-Deletion-Password-2026!',
					},
				}),
		});

		await expectNewRateLimitNamespaces(db, existingRateLimitCounterKeys, protectedOperationRateLimitNamespaces);

		const resetRateLimitCounters = await deleteNewRateLimitCounters(db, existingRateLimitCounterKeys);

		console.log(`✓ ${resetRateLimitCounters} smoke-test rate-limit counters reset before account cleanup`);

		expectStatus(
			await requestApi({
				method: 'DELETE',
				path: '/api/account',
				cookies: session6,

				body: {
					password: resetPassword,
				},
			}),

			200,

			'Delete test account',
		);

		expectStatus(
			await requestApi({
				method: 'GET',
				path: '/api/account/me',
				cookies: session6,
			}),

			401,

			'Deleted account session rejected',
		);

		const [[deletedUser]] = await db.query(
			`
					SELECT
						status,
						password_hash,
						deleted_at
					FROM users
					WHERE id = ?
				`,
			[userId],
		);

		if (deletedUser?.status !== 'deleted' || deletedUser.password_hash !== null || deletedUser.deleted_at === null) {
			throw new Error('The test user was not soft-deleted correctly');
		}

		console.log('✓ Account soft deletion verified');

		const deletedRateLimitCounters = await deleteNewRateLimitCounters(db, existingRateLimitCounterKeys);

		console.log(`✓ ${deletedRateLimitCounters} smoke-test rate-limit counters removed`);

		console.log('\n========================================');

		console.log('REAL AUTHENTICATION SMOKE TEST PASSED');

		console.log('========================================');

		console.log(`Deleted test user: ${email}`);
	} catch (error) {
		console.error('\n========================================');

		console.error('REAL AUTHENTICATION SMOKE TEST FAILED');

		console.error('========================================');

		console.error(error);

		console.error(`Test user for investigation: ${email}`);

		process.exitCode = 1;
	} finally {
		await stopServer();

		if (existingRateLimitCounterKeys) {
			try {
				const deletedRateLimitCounters = await deleteNewRateLimitCounters(db, existingRateLimitCounterKeys);

				if (deletedRateLimitCounters > 0) {
					console.log(`✓ ${deletedRateLimitCounters} smoke-test rate-limit counters removed after failure`);
				}
			} catch (cleanupError) {
				console.error('Unable to clean up smoke-test rate-limit counters', cleanupError);
				process.exitCode = 1;
			}
		}

		await db.end();
	}
}

await run();
