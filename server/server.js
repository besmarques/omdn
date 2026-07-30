import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import createPool from '#server/dbConnect/createPool';
import createApiRoutes from '#server/routes/apiRoutes';
import createAdminRoutes from '#server/routes/adminRoutes';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const db = createPool();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');

app.use(express.json());

app.use('/api', createApiRoutes(db));

app.use('/admin', createAdminRoutes(db));

app.use(express.static(distPath));

app.get('/{*splat}', (req, res) => {
	res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
	console.log(`OMDN running on port ${port}`);
});
