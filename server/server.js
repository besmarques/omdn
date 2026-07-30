import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 3000);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, '../dist');

app.use(express.json());

app.get('/api', (req, res) => {
	res.json({
		status: true,
		message: 'OMDN API is running',
	});
});

app.use('/api', (req, res) => {
	res.status(404).json({
		status: false,
		message: 'API route not found',
	});
});

app.use(express.static(distPath));

app.get('/{*splat}', (req, res) => {
	res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
	console.log(`OMDN running on port ${port}`);
});