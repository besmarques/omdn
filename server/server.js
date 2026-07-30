import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import createSessionMiddleware from '#server/middleware/sessionMiddleware';

import createPool from '#server/dbConnect/createPool';

import requireAuth from '#server/middleware/auth/requireAuth';

import createAccountRoutes from '#server/routes/accountRoutes';
import createAdminRoutes from '#server/routes/adminRoutes';
import createApiRoutes from '#server/routes/apiRoutes';
import createAuthRoutes from '#server/routes/authRoutes';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const db = createPool();
const authenticated = requireAuth(db);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');

app.use(express.json());

if (process.env.APP_ENV === 'production') {
	app.set('trust proxy', 1);
}

app.use(createSessionMiddleware(db));

app.use('/api/auth', createAuthRoutes(db));

app.use('/api/account', authenticated, createAccountRoutes(db));

app.use('/api/admin', authenticated, createAdminRoutes(db));

app.use('/api', createApiRoutes(db));

app.use(express.static(distPath));

if (process.env.APP_ENV === 'production') {
	app.use(express.static(distPath));

	app.get('/{*splat}', (req, res) => {
		res.sendFile(path.join(distPath, 'index.html'));
	});
}

app.listen(port, () => {
	console.log(`OMDN running on port ${port}`);
});
