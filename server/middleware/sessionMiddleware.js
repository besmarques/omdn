import process from 'node:process';

import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

const MySQLStore = MySQLStoreFactory(session);

const sessionDuration = 7 * 24 * 60 * 60 * 1000;

export default function createSessionMiddleware(db) {
	if (!process.env.SESSION_SECRET) {
		throw new Error('SESSION_SECRET is not configured');
	}

	const sessionStore = new MySQLStore(
		{
			clearExpired: true,
			checkExpirationInterval: 15 * 60 * 1000,
			expiration: sessionDuration,
			createDatabaseTable: false,
			schema: {
				tableName: 'sessions',
				columnNames: {
					session_id: 'session_id',
					expires: 'expires',
					data: 'data',
				},
			},
		},
		db,
	);

	return session({
		name: 'omdn_session',
		secret: process.env.SESSION_SECRET,
		store: sessionStore,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: sessionDuration,
		},
	});
}
