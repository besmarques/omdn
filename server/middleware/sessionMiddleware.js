import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';

import { evaluateAuthenticatedSession, rememberedSessionAbsoluteLifetime } from '#server/modules/auth/shared/sessionPolicy';

const MySQLStore = MySQLStoreFactory(session);

const sessionCookieName = 'omdn_session';

export default function createSessionMiddleware(db, config) {
	const sessionStore = new MySQLStore(
		{
			clearExpired: true,
			checkExpirationInterval: 15 * 60 * 1000,
			expiration: rememberedSessionAbsoluteLifetime,
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

	const sessionLoader = session({
		name: sessionCookieName,
		secret: config.secret,
		store: sessionStore,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: config.secureCookie,
			sameSite: 'lax',
			maxAge: rememberedSessionAbsoluteLifetime,
		},
	});
	const middleware = (req, res, next) =>
		sessionLoader(req, res, (error) => {
			if (error) {
				return next(error);
			}

			const policy = evaluateAuthenticatedSession(req.session);

			if (policy.expired) {
				return req.session.destroy((destroyError) => {
					if (destroyError) {
						return next(destroyError);
					}

					res.clearCookie(sessionCookieName, {
						httpOnly: true,
						path: '/',
						secure: config.secureCookie,
						sameSite: 'lax',
					});

					return next();
				});
			}

			if (policy.authenticated) {
				req.session.lastActivityAt = Date.now();
				req.session.cookie.maxAge = policy.maxAge;
			}

			return next();
		});

	return {
		middleware,
		store: sessionStore,
	};
}
