import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import mysql from 'mysql2/promise';

const executeFile = promisify(execFile);
const seedFiles = ['server/database/seeds/001_seed_roles_permissions.sql'];

function requiredEnvironmentValue(name) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is required for Playwright database setup`);
	}

	return value;
}

export function getTestDatabaseName() {
	const databaseName = requiredEnvironmentValue('DB_NAME');

	if (!/^[a-zA-Z0-9_]+_playwright(?:_ssr)?$/u.test(databaseName)) {
		throw new Error(`Refusing to use unsafe Playwright database name: ${databaseName}`);
	}

	return databaseName;
}

function connectionOptions(includeDatabase = true) {
	return {
		host: requiredEnvironmentValue('DB_HOST'),
		port: Number(process.env.DB_PORT ?? 3306),
		user: requiredEnvironmentValue('DB_USER'),
		password: requiredEnvironmentValue('DB_PASSWORD'),
		...(includeDatabase ? { database: getTestDatabaseName() } : {}),
	};
}

export async function rebuildTestDatabase() {
	const databaseName = getTestDatabaseName();
	const adminConnection = await mysql.createConnection({
		...connectionOptions(false),
		multipleStatements: true,
	});

	try {
		await adminConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
		await adminConnection.query(`CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
	} finally {
		await adminConnection.end();
	}

	await executeFile(process.execPath, ['scripts/database/run-dbmate.js', 'migrate'], {
		cwd: process.cwd(),
		env: process.env,
	});

	const seedConnection = await mysql.createConnection({
		...connectionOptions(),
		multipleStatements: true,
	});

	try {
		for (const relativeFile of seedFiles) {
			const sql = await fs.readFile(path.resolve(relativeFile), 'utf8');

			await seedConnection.query(sql);
		}
	} finally {
		await seedConnection.end();
	}
}

export function createTestDatabaseConnection() {
	return mysql.createConnection(connectionOptions());
}
