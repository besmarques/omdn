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

test('server-renders a published recipe with canonical SEO and structured data', async ({ request }) => {
	const response = await request.get('/recipes/bolachas-de-natal');
	const html = await response.text();

	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toBe('public, max-age=0, must-revalidate');
	expect(response.headers()['set-cookie']).toBeUndefined();
	expect(html).toContain('<h1>Bolachas de Natal</h1>');
	expect(html).toContain('Bolachas simples para celebrar o Natal.');
	expect(html).toContain('<title>Bolachas de Natal | O Melhor do Natal</title>');
	expect(html).toContain('rel="canonical" href="http://127.0.0.1:3200/recipes/bolachas-de-natal"');
	expect(html).toContain('property="og:type" content="article"');
	expect(html).toContain('type="application/ld+json"');
	expect(html).toContain('"@type":"Recipe"');
	expect(html).toContain('"name":"Maria Natal"');
	expect(html).toContain('"datePublished":"2026-08-05T00:00:00.000Z"');
});

test('redirects old recipe slugs and returns real recipe/API 404 responses', async ({ request }) => {
	const redirectResponse = await request.get('/recipes/bolachas-antigas', { maxRedirects: 0 });
	const missingPage = await request.get('/recipes/receita-inexistente');
	const missingApi = await request.get('/api/recipes/receita-inexistente');
	const recipeApi = await request.get('/api/recipes/bolachas-de-natal');

	expect(redirectResponse.status()).toBe(301);
	expect(redirectResponse.headers().location).toBe('/recipes/bolachas-de-natal');
	expect(missingPage.status()).toBe(404);
	expect(missingApi.status()).toBe(404);
	expect(await missingApi.json()).toEqual({ status: false, message: 'Recipe not found' });
	expect(recipeApi.status()).toBe(200);
	expect(await recipeApi.json()).toMatchObject({
		status: true,
		data: { slug: 'bolachas-de-natal', title: 'Bolachas de Natal' },
	});
});

test('renders crawlable numbered recipe archive pages and navigation', async ({ request }) => {
	const firstResponse = await request.get('/recipes');
	const firstHtml = await firstResponse.text();
	const secondResponse = await request.get('/recipes?page=2');
	const secondHtml = await secondResponse.text();
	const normalizedPageOne = await request.get('/recipes?page=1', { maxRedirects: 0 });
	const missingPage = await request.get('/recipes?page=3');

	expect(firstResponse.status()).toBe(200);
	expect(firstHtml).toContain('<h1 class="text-4xl font-bold">Receitas de Natal</h1>');
	expect(firstHtml).toContain('rel="canonical" href="http://127.0.0.1:3200/recipes"');
	expect(firstHtml).toContain('rel="next" href="http://127.0.0.1:3200/recipes?page=2"');
	expect(firstHtml).toContain('href="/recipes/bolachas-de-natal"');
	expect(firstHtml).toContain('href="/recipes?page=2"');
	expect(secondResponse.status()).toBe(200);
	expect(secondHtml).toContain('<title>Receitas de Natal — Página 2</title>');
	expect(secondHtml).toContain('rel="prev" href="http://127.0.0.1:3200/recipes"');
	expect(secondHtml).not.toContain('rel="next"');
	expect(secondHtml).toContain('Receita de arquivo 1');
	expect(normalizedPageOne.status()).toBe(301);
	expect(normalizedPageOne.headers().location).toBe('/recipes');
	expect(missingPage.status()).toBe(404);
});
