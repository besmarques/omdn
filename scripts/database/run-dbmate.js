import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config as loadEnvironment } from 'dotenv';
import mysql from 'mysql2/promise';

loadEnvironment({ path: process.env.DB_ENV_FILE ?? '.env.development', quiet: true });

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const migrationsDirectory = fileURLToPath(new URL('../../server/database/migrations', import.meta.url));
const dbmateExecutable = fileURLToPath(new URL('../../node_modules/.bin/dbmate', import.meta.url));

function requiredEnvironment(environment, name, { trim = true } = {}) {
	const rawValue = environment[name];
	const value = trim ? rawValue?.trim() : rawValue;

	if (!value) throw new Error(`Missing required database setting: ${name}`);
	return value;
}

export function readDatabaseConfig(environment = process.env) {
	const port = Number(environment.DB_PORT ?? 3306);

	if (!Number.isInteger(port) || port < 1 || port > 65_535) {
		throw new Error('DB_PORT must be an integer between 1 and 65535');
	}

	return {
		database: requiredEnvironment(environment, 'DB_NAME'),
		host: requiredEnvironment(environment, 'DB_HOST'),
		password: requiredEnvironment(environment, 'DB_PASSWORD', { trim: false }),
		port,
		user: requiredEnvironment(environment, 'DB_USER'),
	};
}

export function createDatabaseUrl(databaseConfig) {
	const host = databaseConfig.host.includes(':') ? `[${databaseConfig.host}]` : databaseConfig.host;
	return `mysql://${encodeURIComponent(databaseConfig.user)}:${encodeURIComponent(databaseConfig.password)}@${host}:${databaseConfig.port}/${encodeURIComponent(databaseConfig.database)}`;
}

export function quoteMysqlIdentifier(value) {
	return `\`${String(value).replaceAll('`', '``')}\``;
}

async function ensureDatabaseExists(databaseConfig) {
	const connection = await mysql.createConnection({
		host: databaseConfig.host,
		password: databaseConfig.password,
		port: databaseConfig.port,
		user: databaseConfig.user,
	});

	try {
		await connection.query(
			`CREATE DATABASE IF NOT EXISTS ${quoteMysqlIdentifier(databaseConfig.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
		);
	} finally {
		await connection.end();
	}
}

export function findOutOfOrderMigration(fileNames, appliedVersionList) {
	const appliedVersions = new Set(appliedVersionList);
	const highestAppliedVersion = [...appliedVersions]
		.map((version) => BigInt(version))
		.reduce((highest, version) => (version > highest ? version : highest), 0n);

	return fileNames
		.map((fileName) => fileName.match(/^(\d+)_.*\.sql$/u)?.[1])
		.filter(Boolean)
		.find((version) => !appliedVersions.has(version) && BigInt(version) < highestAppliedVersion);
}

async function getExistingTables(connection, database) {
	const [rows] = await connection.execute(
		`SELECT table_name
		 FROM information_schema.tables
		 WHERE table_schema = ?`,
		[database],
	);

	return new Set(rows.map(({ TABLE_NAME: tableName, table_name: alternateName }) => tableName ?? alternateName));
}

async function columnExists(connection, database, table, column) {
	const [rows] = await connection.execute(
		`SELECT 1
		 FROM information_schema.columns
		 WHERE table_schema = ? AND table_name = ? AND column_name = ?
		 LIMIT 1`,
		[database, table, column],
	);

	return rows.length === 1;
}

async function indexExists(connection, database, table, index) {
	const [rows] = await connection.execute(
		`SELECT 1
		 FROM information_schema.statistics
		 WHERE table_schema = ? AND table_name = ? AND index_name = ?
		 LIMIT 1`,
		[database, table, index],
	);

	return rows.length === 1;
}

async function baselineLegacyMigrations(databaseConfig) {
	const connection = await mysql.createConnection(databaseConfig);

	try {
		const tables = await getExistingTables(connection, databaseConfig.database);
		const authTables = [
			'users',
			'auth_identities',
			'roles',
			'permissions',
			'user_roles',
			'role_permissions',
			'sessions',
			'email_verification_tokens',
			'password_reset_tokens',
			'user_totp',
			'user_recovery_codes',
			'auth_events',
		];

		const checks = [
			['001', authTables.every((table) => tables.has(table))],
			['002', tables.has('rate_limit_counters')],
			['003', tables.has('auth_event_outbox') && (await columnExists(connection, databaseConfig.database, 'auth_events', 'outbox_id'))],
			['004', tables.has('sessions') && !(await columnExists(connection, databaseConfig.database, 'sessions', 'user_id'))],
			['005', await indexExists(connection, databaseConfig.database, 'users', 'idx_users_deleted_retention')],
		];
		const firstMissingIndex = checks.findIndex(([, isApplied]) => !isApplied);

		if (firstMissingIndex >= 0 && checks.slice(firstMissingIndex + 1).some(([, isApplied]) => isApplied)) {
			throw new Error('The database does not match a complete prefix of legacy migrations 001–005; inspect it manually');
		}

		const existingApplicationTables = [...tables].filter((table) => table !== 'schema_migrations');

		if (firstMissingIndex === 0 && existingApplicationTables.length > 0) {
			throw new Error('The database does not match a complete prefix of legacy migrations 001–005; inspect it manually');
		}

		await connection.execute(
			`CREATE TABLE IF NOT EXISTS schema_migrations (
				version VARCHAR(255) NOT NULL PRIMARY KEY
			) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
		);

		const baselined = [];

		for (const [version] of firstMissingIndex < 0 ? checks : checks.slice(0, firstMissingIndex)) {
			await connection.execute('INSERT IGNORE INTO schema_migrations (version) VALUES (?)', [version]);
			baselined.push(version);
		}

		console.log(
			baselined.length > 0
				? `Recorded verified legacy migrations: ${baselined.join(', ')}`
				: 'No legacy migrations were present; dbmate can migrate this empty database normally',
		);
	} finally {
		await connection.end();
	}
}

async function assertMigrationTrackingIsSafe(databaseConfig) {
	const connection = await mysql.createConnection(databaseConfig);

	try {
		const tables = await getExistingTables(connection, databaseConfig.database);

		if (tables.has('users') && !tables.has('schema_migrations')) {
			throw new Error('This database predates dbmate. Run `npm run db:migrate:baseline` once before migrating it.');
		}

		if (tables.has('schema_migrations')) {
			const [rows] = await connection.execute('SELECT version FROM schema_migrations');
			const appliedVersions = rows.map(({ version }) => version);

			if (tables.has('users') && !appliedVersions.includes('001')) {
				throw new Error('This database has legacy tables without a recorded baseline. Run `npm run db:migrate:baseline` once.');
			}

			const outOfOrderMigration = findOutOfOrderMigration(readdirSync(migrationsDirectory), appliedVersions);

			if (outOfOrderMigration) {
				throw new Error(`Migration ${outOfOrderMigration} is older than an already applied migration; renumber it before deployment`);
			}
		}
	} finally {
		await connection.end();
	}
}

function runDbmate(databaseConfig, commandArguments) {
	const environment = { ...process.env };

	if (databaseConfig) environment.DATABASE_URL = createDatabaseUrl(databaseConfig);

	const result = spawnSync(dbmateExecutable, ['--migrations-dir', migrationsDirectory, '--no-dump-schema', ...commandArguments], {
		cwd: projectRoot,
		env: environment,
		stdio: 'inherit',
	});

	if (result.error) throw result.error;
	process.exitCode = result.status ?? 1;
}

async function main() {
	const [command, ...commandArguments] = process.argv.slice(2);

	if (command === 'new') {
		runDbmate(null, [command, ...commandArguments]);
		return;
	}

	const databaseConfig = readDatabaseConfig();

	if (command === 'baseline') {
		await baselineLegacyMigrations(databaseConfig);
		return;
	}

	const allowedCommands = new Set(['migrate', 'status']);

	if (!allowedCommands.has(command)) {
		throw new Error(`Unsupported dbmate command: ${command ?? '(missing)'}`);
	}

	if (command === 'migrate') {
		await ensureDatabaseExists(databaseConfig);
	}

	await assertMigrationTrackingIsSafe(databaseConfig);
	runDbmate(databaseConfig, [command, ...commandArguments]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
