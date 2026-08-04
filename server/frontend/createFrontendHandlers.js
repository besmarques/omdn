import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultClientBuildPath = path.resolve(__dirname, '../../build/client');

export default function createFrontendHandlers(config, { clientBuildPath = defaultClientBuildPath, getLoadContext } = {}) {
	if (config.appEnvironment !== 'production') {
		return Object.freeze({});
	}

	return Object.freeze({
		assets: express.static(path.join(clientBuildPath, 'assets'), {
			immutable: true,
			maxAge: '1y',
		}),
		publicFiles: express.static(clientBuildPath, { index: false }),
		getLoadContext,
		requestHandler(_req, res) {
			res.sendFile(path.join(clientBuildPath, 'index.html'));
		},
	});
}
