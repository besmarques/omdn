import { expect, test } from '@playwright/test';

test('server-renders the public homepage with metadata and a nonce CSP', async ({ request }) => {
	const response = await request.get('/');
	const html = await response.text();
	const contentSecurityPolicy = response.headers()['content-security-policy'];
	const nonce = contentSecurityPolicy?.match(/'nonce-([^']+)'/u)?.[1];

	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('public, max-age=0, must-revalidate');
	expect(response.headers()['set-cookie']).toBeUndefined();
	expect(html).toContain('<h1');
	expect(html).toContain('O Melhor do Natal');
	expect(html).toContain('<title>O Melhor do Natal</title>');
	expect(html).toContain('name="description"');
	expect(html).toContain('conteúdo e inspiração para celebrar o Natal');
	expect(nonce).toBeTruthy();
	expect(html).toContain(`nonce="${nonce}"`);
});

test('keeps public output account-independent and authentication/private routes uncacheable', async ({ request }) => {
	const firstPublicResponse = await request.get('/', {
		headers: { cookie: 'omdn_session=first-untrusted-session' },
	});
	const secondPublicResponse = await request.get('/', {
		headers: { cookie: 'omdn_session=second-untrusted-session' },
	});
	const firstPublicHtml = await firstPublicResponse.text();
	const secondPublicHtml = await secondPublicResponse.text();
	const firstNonce = firstPublicResponse.headers()['content-security-policy']?.match(/'nonce-([^']+)'/u)?.[1];
	const secondNonce = secondPublicResponse.headers()['content-security-policy']?.match(/'nonce-([^']+)'/u)?.[1];
	const loginResponse = await request.get('/login');
	const privateResponse = await request.get('/admin', { maxRedirects: 0 });
	const accountSecurityResponse = await request.get('/account/security', { maxRedirects: 0 });

	expect(firstNonce).toBeTruthy();
	expect(secondNonce).toBeTruthy();
	expect(firstPublicHtml.replaceAll(firstNonce, '<nonce>')).toBe(secondPublicHtml.replaceAll(secondNonce, '<nonce>'));
	expect(loginResponse.headers()['cache-control']).toBe('private, no-store');
	expect(loginResponse.headers()['set-cookie']).toBeUndefined();
	expect(privateResponse.status()).toBe(302);
	expect(privateResponse.headers().location).toBe('/login');
	expect(privateResponse.headers()['cache-control']).toBe('private, no-store');
	expect(accountSecurityResponse.status()).toBe(302);
	expect(accountSecurityResponse.headers().location).toBe('/login');
	expect(accountSecurityResponse.headers()['cache-control']).toBe('private, no-store');
});

test('hydrates the server-rendered homepage without browser problems', async ({ page }) => {
	const browserProblems = [];

	page.on('console', (message) => {
		if (['warning', 'error'].includes(message.type())) {
			browserProblems.push(message.text());
		}
	});
	page.on('pageerror', (error) => browserProblems.push(error.message));

	const response = await page.goto('/');

	expect(response?.status()).toBe(200);
	await expect(page.getByRole('heading', { name: 'O Melhor do Natal' })).toBeVisible();
	expect(browserProblems).toEqual([]);
});

test('returns a rendered 404 document while keeping API responses JSON', async ({ request }) => {
	const missingResponse = await request.get('/missing-page');
	const missingHtml = await missingResponse.text();
	const apiResponse = await request.get('/api/');

	expect(missingResponse.status()).toBe(404);
	expect(missingHtml).toContain('<h1>Page not found</h1>');
	expect(apiResponse.status()).toBe(200);
	expect(apiResponse.headers()['content-type']).toContain('application/json');
	expect(await apiResponse.json()).toMatchObject({ status: true });
});
