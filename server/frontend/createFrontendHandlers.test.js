import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import express from 'express';
import request from 'supertest';

import { afterEach, describe, expect, it } from 'vitest';

import createFrontendHandlers from '#server/frontend/createFrontendHandlers';

const temporaryDirectories = [];

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('frontend handlers', () => {
	it('serves fingerprinted assets with immutable one-year caching', async () => {
		const clientBuildPath = await mkdtemp(path.join(os.tmpdir(), 'omdn-client-build-'));
		temporaryDirectories.push(clientBuildPath);
		await mkdir(path.join(clientBuildPath, 'assets'));
		await writeFile(path.join(clientBuildPath, 'assets', 'application-ABC123.js'), 'export default true;');

		const handlers = createFrontendHandlers({ appEnvironment: 'production' }, { clientBuildPath });
		const app = express();

		app.use('/assets', handlers.assets);

		const response = await request(app).get('/assets/application-ABC123.js');

		expect(response.status).toBe(200);
		expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
	});

	it('does not create frontend handlers outside production', () => {
		expect(createFrontendHandlers({ appEnvironment: 'development' })).toEqual({});
	});
});
