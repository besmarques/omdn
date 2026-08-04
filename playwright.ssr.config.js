import { defineConfig, devices } from '@playwright/test';
import { config as loadEnvironment } from 'dotenv';

loadEnvironment({ path: '.env.development', quiet: true });

const sourceDatabaseName = process.env.DB_NAME?.trim();
const serverPort = Number(process.env.PLAYWRIGHT_SSR_PORT ?? 3200);

if (!sourceDatabaseName) {
	throw new Error('DB_NAME is required in .env.development');
}

const testDatabaseName = sourceDatabaseName.endsWith('_playwright_ssr')
	? sourceDatabaseName
	: `${sourceDatabaseName.replace(/_playwright$/u, '')}_playwright_ssr`;

if (!/^[a-zA-Z0-9_]+_playwright_ssr$/u.test(testDatabaseName)) {
	throw new Error(`Unsafe SSR Playwright database name: ${testDatabaseName}`);
}

if (!Number.isInteger(serverPort) || serverPort < 1 || serverPort > 65_535) {
	throw new Error(`Invalid SSR Playwright port: ${serverPort}`);
}

process.env.APP_ENV = 'production';
process.env.DB_NAME = testDatabaseName;
process.env.PORT = String(serverPort);
process.env.PUBLIC_BASE_URL = `http://127.0.0.1:${serverPort}`;
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_FROM_EMAIL = 'no-reply@example.com';

export default defineConfig({
	testDir: './tests/ssr',
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: `http://127.0.0.1:${serverPort}`,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'node tests/e2e/startBackend.js',
		url: `http://127.0.0.1:${serverPort}/api/`,
		reuseExistingServer: false,
		timeout: 30_000,
		env: { ...process.env },
	},
});
