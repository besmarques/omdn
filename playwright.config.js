import { defineConfig, devices } from '@playwright/test';
import { config as loadEnvironment } from 'dotenv';

loadEnvironment({ path: '.env.development', quiet: true });

const sourceDatabaseName = process.env.DB_NAME?.trim();

if (!sourceDatabaseName) {
	throw new Error('DB_NAME is required in .env.development');
}

const testDatabaseName = sourceDatabaseName.endsWith('_playwright') ? sourceDatabaseName : `${sourceDatabaseName}_playwright`;

if (!/^[a-zA-Z0-9_]+_playwright$/.test(testDatabaseName)) {
	throw new Error(`Unsafe Playwright database name: ${testDatabaseName}`);
}

process.env.APP_ENV = 'development';
process.env.DB_NAME = testDatabaseName;
process.env.PORT = '3000';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://127.0.0.1:5173',
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
			url: 'http://127.0.0.1:3000/api/',
			reuseExistingServer: false,
			timeout: 30_000,
			env: { ...process.env },
		},
		{
			command: 'npm run dev -- --host 127.0.0.1 --port 5173',
			url: 'http://127.0.0.1:5173',
			reuseExistingServer: false,
			timeout: 30_000,
			env: { ...process.env },
		},
	],
});
