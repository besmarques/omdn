import process from 'node:process';

import mysql from 'mysql2/promise';

export default function createPool() {
	return mysql.createPool({
		host: process.env.DB_HOST,
		port: Number(process.env.DB_PORT ?? 3306),
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		waitForConnections: true,
		connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
		queueLimit: 0,
	});
}