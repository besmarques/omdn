import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import createSessionMiddleware from '#server/middleware/sessionMiddleware';

import createAccountModule from '#server/modules/account/accountModule';
import createAdminModule from '#server/modules/admin/adminModule';
import createAuthModule from '#server/modules/auth/authModule';
import requireAuth from '#server/modules/auth/shared/middleware/requireAuth';

import createApiRoutes from '#server/routes/apiRoutes';

export default function createApp(db) {
	const app = express();

	app.use(express.json());

	if (process.env.APP_ENV === 'production') {
		app.set('trust proxy', 1);
	}

	app.use(createSessionMiddleware(db));

	const authenticated = requireAuth(db);

	app.use('/api/auth', createAuthModule(db));
	app.use('/api/admin', authenticated, createAdminModule());
	app.use('/api/account', authenticated, createAccountModule());

	// Generic API routes and API 404 handling must stay last.
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