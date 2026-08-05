import fs from 'node:fs/promises';
import path from 'node:path';

import mysql from 'mysql2/promise';

function requiredEnvironmentValue(name) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

const seedsDirectory = new URL('../../server/database/seeds/', import.meta.url);
const seedFiles = (await fs.readdir(seedsDirectory)).filter((file) => /^\d+_[a-z0-9_]+\.sql$/u.test(file)).sort();
const connection = await mysql.createConnection({
	host: requiredEnvironmentValue('DB_HOST'),
	port: Number(process.env.DB_PORT ?? 3306),
	user: requiredEnvironmentValue('DB_USER'),
	password: process.env.DB_PASSWORD ?? '',
	database: requiredEnvironmentValue('DB_NAME'),
	multipleStatements: true,
});

try {
	for (const file of seedFiles) {
		const sql = await fs.readFile(new URL(file, seedsDirectory), 'utf8');

		await connection.query(sql);
		console.log(`Applied seed: ${path.basename(file)}`);
	}
} finally {
	await connection.end();
}
