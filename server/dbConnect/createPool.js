import mysql from 'mysql2/promise';

export default function createPool(config) {
	return mysql.createPool({
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		database: config.name,
		waitForConnections: true,
		connectionLimit: config.connectionLimit,
		queueLimit: 0,
	});
}
