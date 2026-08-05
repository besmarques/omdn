import { createHash, createHmac, randomBytes } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { createTestDatabaseConnection } from './database.js';

const email = 'playwright-auth@example.com';
const password = 'Playwright-Password-2026!';

function decodeBase32(value) {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = '';

	for (const character of value.replace(/=+$/u, '').toUpperCase()) {
		const index = alphabet.indexOf(character);

		if (index < 0) {
			throw new Error('Invalid Base32 TOTP secret');
		}

		bits += index.toString(2).padStart(5, '0');
	}

	const bytes = [];

	for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
		bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
	}

	return Buffer.from(bytes);
}

function generateTotp(secret, period = 30) {
	const counter = Math.floor(Date.now() / 1000 / period);
	const counterBuffer = Buffer.alloc(8);

	counterBuffer.writeBigUInt64BE(BigInt(counter));

	const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
	const offset = digest.at(-1) & 0x0f;
	const binary = digest.readUInt32BE(offset) & 0x7fffffff;

	return String(binary % 1_000_000).padStart(6, '0');
}

async function expectApiResponse(response, expectedStatus) {
	const body = await response.json();

	expect(response.status(), JSON.stringify(body)).toBe(expectedStatus);

	return body;
}

async function getCsrfToken(request) {
	const response = await request.get('/api/auth/csrf');
	const body = await expectApiResponse(response, 200);

	return body.data.csrfToken;
}

async function loginThroughPage(page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await expect(page.getByLabel('Remember me for 30 days')).toBeVisible();
	await page.getByRole('button', { name: 'Login' }).click();
}

test('loads Framework route modules directly and through client navigation', async ({ page }) => {
	const browserErrors = [];

	page.on('console', (message) => {
		if (message.type() === 'error') {
			browserErrors.push(message.text());
		}
	});
	page.on('pageerror', (error) => browserErrors.push(error.message));

	const response = await page.goto('/register');

	expect(response?.status()).toBe(200);
	await expect(page.getByLabel('Display name')).toBeVisible();
	await expect(page).toHaveTitle('omdn');
	expect(await page.locator('html').getAttribute('lang')).toBe('en');
	expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toBe('width=device-width, initial-scale=1.0');

	const faviconPath = await page.locator('link[rel="icon"]').getAttribute('href');
	const faviconResponse = await page.request.get(faviconPath);

	expect(faviconResponse.status()).toBe(200);
	expect(faviconResponse.headers()['content-type']).toContain('image/svg+xml');

	await page.getByRole('link', { name: 'Go to login' }).click();
	await expect(page).toHaveURL(/\/login$/u);
	await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

	await page.goto('/dev/design-system');
	await expect(page.getByRole('heading', { name: 'Design System' })).toBeVisible();

	const missingResponse = await page.goto('/route-that-does-not-exist');
	expect(missingResponse?.status()).toBe(404);
	await expect(page.getByText('Page not found')).toBeVisible();
	expect(browserErrors.filter((message) => !message.includes('server responded with a status of 404'))).toEqual([]);
});

test('renders the homepage through its Framework route module', async ({ page }) => {
	const browserProblems = [];

	page.on('console', (message) => {
		if (['warning', 'error'].includes(message.type())) {
			browserProblems.push(message.text());
		}
	});
	page.on('pageerror', (error) => browserProblems.push(error.message));

	const response = await page.goto('/');

	expect(response?.status()).toBe(200);
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'O Melhor do Natal' })).toBeVisible();
	expect(browserProblems).toEqual([]);
});

test('composes development page templates independently from layouts and regions', async ({ page }) => {
	const recipeResponse = await page.goto('/dev/page-examples/recipe');

	expect(recipeResponse?.status()).toBe(200);
	await expect(page.getByRole('heading', { level: 1, name: 'Christmas biscuits' })).toBeVisible();
	await expect(page.getByText('200 g plain flour')).toBeVisible();
	await expect(page.getByText('15 minutes')).toBeVisible();
	expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('"@type":"Recipe"');
	await expect(page.getByRole('complementary', { name: 'Related content' })).toContainText('Related recipes');
	await expect(page.getByRole('complementary', { name: 'Related content' })).toContainText('Christmas newsletter');

	await page.getByRole('link', { name: 'Gift ideas, full width' }).click();
	await expect(page).toHaveURL(/\/dev\/page-examples\/gift-ideas$/u);
	await expect(page.getByRole('heading', { level: 1, name: 'Gift ideas for a close friend' })).toBeVisible();
	await expect(page.getByRole('complementary', { name: 'Related content' })).toHaveCount(0);
});

test('edits and restores a recipe description with the self-hosted TinyMCE proof', async ({ page }) => {
	await page.goto('/dev/recipe-editor');

	await expect(page.getByRole('heading', { level: 1, name: 'Recipe description editor proof' })).toBeVisible();
	await expect(page.locator('.tox-tinymce')).toBeVisible();
	await expect(page.frameLocator('.tox-edit-area iframe').locator('body')).toContainText('buttery biscuits');

	await page.evaluate(() => {
		globalThis.tinymce.activeEditor.setContent('<p onclick="alert(1)"><strong>Updated locally</strong><script>alert(1)</script></p>');
	});
	await page.getByRole('button', { name: 'Save proof revision' }).click();

	await expect(page.getByText('Recipe revision validated, sanitized on the server, restored, and rendered below.')).toBeVisible();
	await expect(page.locator('article').getByText('Updated locally')).toBeVisible();
	expect(await page.locator('article').innerHTML()).not.toContain('onclick');
	expect(await page.locator('article').innerHTML()).not.toContain('<script>alert(1)</script>');
});

test('characterizes registration, authentication, TOTP, and admin access', async ({ page }) => {
	const database = await createTestDatabaseConnection();
	let currentAccountRequestCount = 0;
	const browserErrors = [];

	page.on('request', (request) => {
		if (new URL(request.url()).pathname === '/api/account/me') {
			currentAccountRequestCount += 1;
		}
	});
	page.on('console', (message) => {
		if (message.type() === 'error') {
			browserErrors.push(message.text());
		}
	});
	page.on('pageerror', (error) => browserErrors.push(error.message));

	try {
		await test.step('register a subscriber', async () => {
			await page.goto('/register');
			await page.getByLabel('Display name').fill('Playwright User');
			await page.getByLabel('Email').fill(email);
			await page.getByLabel('Password').fill(password);
			await page.getByRole('button', { name: 'Register' }).click();

			await expect(page.getByText('If the email address can be registered')).toBeVisible();
		});

		await test.step('verify the email without a manual token', async () => {
			const verificationToken = randomBytes(32).toString('hex');
			const verificationTokenHash = createHash('sha256').update(verificationToken).digest();
			const [result] = await database.execute(
				`UPDATE email_verification_tokens
				 SET token_hash = ?, expires_at = DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 1 HOUR)
				 WHERE user_id = (SELECT id FROM users WHERE email = ?)`,
				[verificationTokenHash, email],
			);

			expect(result.affectedRows).toBe(1);

			await page.goto(`/verify-email?token=${verificationToken}`);
			await expect(page.getByText('Email verified successfully')).toBeVisible();
		});

		await test.step('deny a subscriber access to the admin page', async () => {
			const accountRequestsBeforeLogin = currentAccountRequestCount;
			await loginThroughPage(page);
			await expect(page).toHaveURL(/\/account\/security$/u);
			await expect(page.getByRole('heading', { name: 'Account security' })).toBeVisible();
			expect(currentAccountRequestCount).toBe(accountRequestsBeforeLogin + 1);
			await page.goto('/login');
			await expect(page).toHaveURL(/\/account\/security$/u);

			await page.goto('/admin');
			await expect(page.getByText('Forbidden')).toBeVisible();
			await page.getByRole('button', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/\/login$/u);
		});

		await test.step('allow an administrator to access the admin page', async () => {
			await database.execute(
				`INSERT IGNORE INTO user_roles (user_id, role_id)
				 SELECT users.id, roles.id
				 FROM users
				 JOIN roles ON roles.slug = 'administrator'
				 WHERE users.email = ?`,
				[email],
			);

			const accountRequestsBeforeLogin = currentAccountRequestCount;
			await loginThroughPage(page);
			await expect(page).toHaveURL(/\/admin$/u);
			await expect(page.getByText('You have access to this admin route')).toBeVisible();
			expect(currentAccountRequestCount).toBe(accountRequestsBeforeLogin + 1);
			await page.goto('/login');
			await expect(page).toHaveURL(/\/admin$/u);
		});

		await test.step('create and publish a recipe from the admin page', async () => {
			await page.getByRole('link', { name: 'Add recipe' }).click();
			await expect(page).toHaveURL(/\/admin\/recipes\/new$/u);
			await page.getByLabel('Title', { exact: true }).fill('Playwright Christmas cake');
			await page.getByLabel('Description', { exact: true }).fill('A cake created through the protected administration workflow.');
			await page.getByLabel('Excerpt').fill('A short festive cake summary.');
			await page.getByLabel('Ingredients').fill('250 | g | flour\n100 | g | butter');
			await page.getByLabel('Instructions').fill('Mix the ingredients.\nBake the cake.');
			await page.getByLabel('Preparation minutes').fill('20');
			await page.getByLabel('Cooking minutes').fill('40');
			await page.getByLabel('Yield quantity').fill('8');
			await page.getByLabel('Yield unit').fill('slices');
			await page.getByLabel('SEO title').fill('Christmas cake recipe | O Melhor do Natal');
			await page.getByLabel('Meta description').fill('Bake a festive Christmas cake with this tested recipe.');
			await page.getByLabel('Focus keyword').fill('christmas cake recipe');
			await page.getByLabel('This post is pillar content').check();
			await page.getByLabel('Publication').selectOption('publish');
			const createResponsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/recipes');
			await page.getByRole('button', { name: 'Create recipe' }).click();
			const createResponse = await createResponsePromise;

			expect(createResponse.status()).toBe(201);

			await expect(page).toHaveURL(/\/recipes\/playwright-christmas-cake$/u);
			await expect(page.getByRole('heading', { level: 1, name: 'Playwright Christmas cake' })).toBeVisible();
			await expect(page.locator('meta[name="description"]')).toHaveAttribute(
				'content',
				'Bake a festive Christmas cake with this tested recipe.',
			);
			await expect(page).toHaveTitle('Christmas cake recipe | O Melhor do Natal');
			const [[created]] = await database.execute(
				`SELECT posts.status, posts.is_pillar_content, post_revisions.excerpt, post_revisions.focus_keyword,
				        COUNT(content_events.id) AS event_count
				 FROM posts
				 INNER JOIN route_slugs ON route_slugs.resource_id = posts.id AND route_slugs.resource_type = 'post'
				 INNER JOIN post_revision_heads ON post_revision_heads.post_id = posts.id
				 INNER JOIN post_revisions ON post_revisions.id = post_revision_heads.published_revision_id
				 LEFT JOIN content_events ON content_events.post_id = posts.id
				 WHERE route_slugs.slug = 'playwright-christmas-cake'
				 GROUP BY posts.id, posts.status, posts.is_pillar_content, post_revisions.excerpt, post_revisions.focus_keyword`,
			);

			expect(created.status).toBe('published');
			expect(Number(created.is_pillar_content)).toBe(1);
			expect(created.excerpt).toBe('A short festive cake summary.');
			expect(created.focus_keyword).toBe('christmas cake recipe');
			expect(Number(created.event_count)).toBe(1);
			await page.goto('/admin');
		});

		await test.step('schedule a recipe from the admin page', async () => {
			await page.getByRole('link', { name: 'Add recipe' }).click();
			await page.getByLabel('Title', { exact: true }).fill('Scheduled Playwright pudding');
			await page.getByLabel('Description', { exact: true }).fill('A recipe that should remain private until its scheduled time.');
			await page.getByLabel('Ingredients').fill('500 | ml | milk');
			await page.getByLabel('Instructions').fill('Cook the pudding.');
			await page.getByLabel('Preparation minutes').fill('10');
			await page.getByLabel('Cooking minutes').fill('30');
			await page.getByLabel('Yield quantity').fill('6');
			await page.getByLabel('Yield unit').fill('servings');
			await page.getByLabel('Publication').selectOption('schedule');
			const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
			await page.getByLabel('Publication date and time').fill(tomorrow);
			const createResponsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/recipes');
			await page.getByRole('button', { name: 'Create recipe' }).click();
			const createResponse = await createResponsePromise;

			await expectApiResponse(createResponse, 201);
			await expect(createResponse.json()).resolves.toMatchObject({
				data: { publication: 'schedule', slug: 'scheduled-playwright-pudding' },
				status: true,
			});
			await expect(page.getByRole('status')).toContainText('Recipe scheduled for');
			const [[scheduled]] = await database.execute(
				`SELECT posts.status, publication_schedules.status AS schedule_status
				 FROM posts
				 INNER JOIN route_slugs ON route_slugs.resource_id = posts.id AND route_slugs.resource_type = 'post'
				 INNER JOIN publication_schedules ON publication_schedules.post_id = posts.id
				 WHERE route_slugs.slug = 'scheduled-playwright-pudding'`,
			);

			expect(scheduled.status).toBe('scheduled');
			expect(scheduled.schedule_status).toBe('pending');
			const privateRecipeResponse = await page.request.get('/api/recipes/scheduled-playwright-pudding');
			expect(privateRecipeResponse.status()).toBe(404);
			await database.execute(
				`UPDATE publication_schedules
				 SET publish_at = DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 SECOND),
				     available_at = DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 SECOND)
				 WHERE post_id = (
					SELECT resource_id FROM route_slugs
					WHERE resource_type = 'post' AND slug = 'scheduled-playwright-pudding'
				 )`,
			);
			await expect
				.poll(async () => (await page.request.get('/api/recipes/scheduled-playwright-pudding')).status(), { timeout: 5000 })
				.toBe(200);
			const [[completedSchedule]] = await database.execute(
				`SELECT publication_schedules.status
				 FROM publication_schedules
				 INNER JOIN route_slugs ON route_slugs.resource_id = publication_schedules.post_id
				 WHERE route_slugs.resource_type = 'post' AND route_slugs.slug = 'scheduled-playwright-pudding'`,
			);
			expect(completedSchedule.status).toBe('completed');
			await page.goto('/admin');
		});

		let totpSecret;
		let recoveryCode;

		await test.step('enable TOTP in the authenticated browser session', async () => {
			await page.getByRole('link', { name: 'Account security' }).click();
			await expect(page).toHaveURL(/\/account\/security$/u);
			await page.getByRole('button', { name: 'Set up authenticator' }).click();
			await expect(page.getByAltText('Authenticator setup QR code')).toBeVisible();

			const manualSetupText = await page.getByText(/Manual setup key:/u).textContent();
			totpSecret = manualSetupText.replace('Manual setup key:', '').trim();
			await page.getByLabel('Authenticator code').fill(generateTotp(totpSecret));
			await page.getByRole('button', { name: 'Confirm and enable' }).click();
			await expect(page.getByText('Two-factor authentication enabled. Save the recovery codes now.')).toBeVisible();

			recoveryCode = await page.locator('section').filter({ hasText: 'Recovery codes' }).locator('code').first().textContent();

			expect(recoveryCode).toBeTruthy();

			// Enabling TOTP consumes the current time step. Resetting this replay
			// marker in the isolated test database avoids a 30-second test delay.
			await database.execute(
				`UPDATE user_totp
				 SET last_used_step = NULL
				 WHERE user_id = (SELECT id FROM users WHERE email = ?)`,
				[email],
			);

			await page.getByRole('link', { name: 'Back' }).click();
			await page.getByRole('button', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/\/login$/u);
		});

		await test.step('require and verify a TOTP login', async () => {
			const accountRequestsBeforeLogin = currentAccountRequestCount;
			await loginThroughPage(page);
			await expect(page.getByLabel('Authenticator or recovery code')).toBeVisible();

			const privateResponse = await page.request.get('/admin', {
				maxRedirects: 0,
			});
			expect(privateResponse.status()).toBe(302);
			expect(privateResponse.headers().location).toBe('/login');

			await page.getByLabel('Authenticator or recovery code').fill(generateTotp(totpSecret));
			await page.getByRole('button', { name: 'Verify and login' }).click();
			await expect(page).toHaveURL(/\/admin$/u);
			await expect(page.getByText('You have access to this admin route')).toBeVisible();
			expect(currentAccountRequestCount).toBe(accountRequestsBeforeLogin + 1);

			await page.getByRole('button', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/\/login$/u);
		});

		await test.step('complete login with a recovery code and log out', async () => {
			const accountRequestsBeforeLogin = currentAccountRequestCount;
			await loginThroughPage(page);
			await page.getByLabel('Authenticator or recovery code').fill(recoveryCode);
			await page.getByRole('button', { name: 'Verify and login' }).click();
			await expect(page).toHaveURL(/\/admin$/u);
			await expect(page.getByText('You have access to this admin route')).toBeVisible();
			expect(currentAccountRequestCount).toBe(accountRequestsBeforeLogin + 1);
			await page.getByRole('button', { name: 'Logout' }).click();
			await expect(page).toHaveURL(/\/login$/u);

			await page.goto('/admin');
			await expect(page).toHaveURL(/\/login$/u);
		});

		expect(browserErrors).toEqual([]);
	} finally {
		await database.end();
	}
});

test('rate limits invalid password reset attempts', async ({ request }) => {
	const payload = {
		token: 'f'.repeat(64),
		password: 'Invalid-Reset-Password-2026!',
	};

	const csrfToken = await getCsrfToken(request);

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const response = await request.post('/api/auth/password/reset', {
			data: payload,
			headers: {
				'x-csrf-token': csrfToken,
			},
		});

		expect(response.status()).toBe(400);
	}

	const limitedResponse = await request.post('/api/auth/password/reset', {
		data: payload,
		headers: {
			'x-csrf-token': csrfToken,
		},
	});

	expect(limitedResponse.status()).toBe(429);
	expect(await limitedResponse.json()).toMatchObject({
		status: false,
		message: 'Too many password reset attempts. Please try again later.',
	});
});
