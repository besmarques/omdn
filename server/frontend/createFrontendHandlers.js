import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { createRequestHandler } from '@react-router/express';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultClientBuildPath = path.resolve(__dirname, '../../build/client');
const defaultServerBuildPath = path.resolve(__dirname, '../../build/server/index.js');

export default function createFrontendHandlers(
	config,
	{
		clientBuildPath = defaultClientBuildPath,
		createHandler = createRequestHandler,
		getLoadContext,
		serverBuildPath = defaultServerBuildPath,
	} = {},
) {
	if (config.appEnvironment !== 'production') {
		return Object.freeze({});
	}

	const serverBuildUrl = pathToFileURL(serverBuildPath).href;

	return Object.freeze({
		assets: express.static(path.join(clientBuildPath, 'assets'), {
			immutable: true,
			maxAge: '1y',
		}),
		publicFiles: express.static(clientBuildPath, { index: false }),
		requestHandler: createHandler({
			build: () => import(serverBuildUrl),
			getLoadContext,
			mode: config.appEnvironment,
		}),
	});
}
