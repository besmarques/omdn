import { defineConfig, devices } from '@playwright/test';
import { config as loadEnvironment } from 'dotenv';

loadEnvironment({ path: '.env.development', quiet: true });

const sourceDatabaseName = process.env.DB_NAME?.trim();
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? 3100);
const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? 5174);

if (!sourceDatabaseName) {
	throw new Error('DB_NAME is required in .env.development');
}

const testDatabaseName = sourceDatabaseName.endsWith('_playwright') ? sourceDatabaseName : `${sourceDatabaseName}_playwright`;

if (!/^[a-zA-Z0-9_]+_playwright$/.test(testDatabaseName)) {
	throw new Error(`Unsafe Playwright database name: ${testDatabaseName}`);
}

if (!Number.isInteger(backendPort) || backendPort < 1 || backendPort > 65_535) {
	throw new Error(`Invalid Playwright backend port: ${backendPort}`);
}

if (!Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65_535) {
	throw new Error(`Invalid Playwright frontend port: ${frontendPort}`);
}

process.env.APP_ENV = 'development';
process.env.DB_NAME = testDatabaseName;
process.env.PORT = String(backendPort);

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://127.0.0.1:${frontendPort}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: [
		{
			command: 'node tests/e2e/startBackend.js',
			url: `http://127.0.0.1:${backendPort}/api/`,
			reuseExistingServer: false,
			timeout: 30_000,
			env: { ...process.env },
		},
		{
			command: `npm run dev -- --host 127.0.0.1 --port ${frontendPort}`,
			url: `http://127.0.0.1:${frontendPort}`,
			reuseExistingServer: false,
			timeout: 30_000,
			env: { ...process.env },
		},
	],
});
