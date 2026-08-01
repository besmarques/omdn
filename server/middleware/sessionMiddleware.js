import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

const MySQLStore = MySQLStoreFactory(session);

const sessionDuration = 7 * 24 * 60 * 60 * 1000;

export default function createSessionMiddleware(db, config) {
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
		secret: config.secret,
		store: sessionStore,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: config.secureCookie,
			sameSite: 'lax',
			maxAge: sessionDuration,
		},
	});
}
