import process from 'node:process';

import mysql from 'mysql2/promise';

const confirmationFlag = '--confirm-delete-all-data';

function getRequiredEnvironmentValue(name) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

if (process.env.APP_ENV !== 'development') {
	throw new Error('Database clearing is allowed only when APP_ENV=development');
}

if (!process.argv.includes(confirmationFlag)) {
	throw new Error(`Refusing to delete data without ${confirmationFlag}`);
}

const databaseName = getRequiredEnvironmentValue('DB_NAME');

const connection = await mysql.createConnection({
	host: getRequiredEnvironmentValue('DB_HOST'),
	port: Number(process.env.DB_PORT ?? 3306),
	user: getRequiredEnvironmentValue('DB_USER'),
	password: getRequiredEnvironmentValue('DB_PASSWORD'),
	database: databaseName,
});

let foreignKeyChecksDisabled = false;

try {
	const [tables] = await connection.query(
		`
			SELECT TABLE_NAME
			FROM information_schema.TABLES
			WHERE TABLE_SCHEMA = ?
				AND TABLE_TYPE = 'BASE TABLE'
			ORDER BY TABLE_NAME
		`,
		[databaseName],
	);

	if (tables.length === 0) {
		console.log(`No tables found in database ${databaseName}.`);
		process.exitCode = 0;
	} else {
		console.log(`Deleting all data from ${tables.length} tables in ${databaseName}...`);

		await connection.query('SET FOREIGN_KEY_CHECKS = 0');
		foreignKeyChecksDisabled = true;

		for (const { TABLE_NAME: tableName } of tables) {
			await connection.query('TRUNCATE TABLE ??', [tableName]);
			console.log(`✓ ${tableName}`);
		}

		console.log(`All data was deleted from database ${databaseName}.`);
	}
} finally {
	if (foreignKeyChecksDisabled) {
		await connection.query('SET FOREIGN_KEY_CHECKS = 1');
	}

	await connection.end();
}
