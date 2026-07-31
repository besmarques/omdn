import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import requireAuth from '#server/middleware/auth/requireAuth';
import createSessionMiddleware from '#server/middleware/sessionMiddleware';

import createAccountRoutes from '#server/routes/accountRoutes';
import createAdminRoutes from '#server/routes/adminRoutes';
import createApiRoutes from '#server/routes/apiRoutes';
import createAuthRoutes from '#server/routes/authRoutes';

export default function createApp(db) {
	const app = express();

	app.use(express.json());

	if (process.env.APP_ENV === 'production') {
		app.set('trust proxy', 1);
	}

	app.use(createSessionMiddleware(db));

	const authenticated = requireAuth(db);

	app.use('/api/auth', createAuthRoutes(db));
	app.use('/api/account', authenticated, createAccountRoutes(db));
	app.use('/api/admin', authenticated, createAdminRoutes(db));
	app.use('/api', createApiRoutes(db));

	if (process.env.APP_ENV === 'production') {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = path.dirname(__filename);
		const distPath = path.resolve(__dirname, '../dist');

		app.use(express.static(distPath));

		app.get('/{*splat}', (req, res) => {
			res.sendFile(path.join(distPath, 'index.html'));
		});
	}

	return app;
}
