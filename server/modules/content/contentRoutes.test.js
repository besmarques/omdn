import express from 'express';
import request from 'supertest';

import { describe, expect, it, vi } from 'vitest';

import createContentRoutes from './contentRoutes';

function createApp(publicRecipes) {
	const app = express();

	app.use('/api', createContentRoutes({ publicRecipes }));

	return app;
}

describe('public content routes', () => {
	it('returns a recipe and redirects a historical slug', async () => {
		const publicRecipes = {
			getBySlug: vi
				.fn()
				.mockResolvedValueOnce({ canonicalSlug: 'biscuits', redirect: false, recipe: { id: 1, title: 'Biscuits' } })
				.mockResolvedValueOnce({ canonicalSlug: 'biscuits', redirect: true, recipe: { id: 1 } }),
			list: vi.fn(),
		};

		const canonical = await request(createApp(publicRecipes)).get('/api/recipes/biscuits');
		const historical = await request(createApp(publicRecipes)).get('/api/recipes/old-biscuits').redirects(0);

		expect(canonical.status).toBe(200);
		expect(canonical.body).toEqual({ status: true, data: { id: 1, title: 'Biscuits' } });
		expect(historical.status).toBe(301);
		expect(historical.headers.location).toBe('/api/recipes/biscuits');
	});

	it('returns a JSON 404 for an unpublished or missing recipe', async () => {
		const response = await request(createApp({ getBySlug: vi.fn().mockResolvedValue(null), list: vi.fn() })).get('/api/recipes/missing');

		expect(response.status).toBe(404);
		expect(response.body).toEqual({ status: false, message: 'Recipe not found' });
	});

	it('encodes pagination cursors and rejects malformed input', async () => {
		const publicRecipes = {
			getBySlug: vi.fn(),
			list: vi.fn().mockResolvedValue({
				items: [{ id: 2, title: 'Biscuits' }],
				nextCursor: { id: 2, publishedAt: '2026-08-05T00:00:00.000Z' },
			}),
		};
		const app = createApp(publicRecipes);
		const response = await request(app).get('/api/recipes?limit=1');
		const invalid = await request(app).get('/api/recipes?cursor=not-json');

		expect(response.status).toBe(200);
		expect(response.body.data.items).toEqual([{ id: 2, title: 'Biscuits' }]);
		expect(JSON.parse(Buffer.from(response.body.data.nextCursor, 'base64url').toString('utf8'))).toEqual({
			id: 2,
			publishedAt: '2026-08-05T00:00:00.000Z',
		});
		expect(invalid.status).toBe(400);
		expect(publicRecipes.list).toHaveBeenCalledWith({ cursor: null, limit: 1 });
	});

	it('returns numbered archive pages and rejects missing or malformed pages', async () => {
		const publicRecipes = {
			getBySlug: vi.fn(),
			list: vi.fn(),
			listArchivePage: vi.fn().mockResolvedValueOnce({ items: [], page: 2, totalPages: 3 }).mockResolvedValueOnce(null),
		};
		const app = createApp(publicRecipes);
		const response = await request(app).get('/api/recipes/archive?page=2');
		const missing = await request(app).get('/api/recipes/archive?page=20');
		const invalid = await request(app).get('/api/recipes/archive?page=zero');

		expect(response.body).toEqual({ status: true, data: { items: [], page: 2, totalPages: 3 } });
		expect(publicRecipes.listArchivePage).toHaveBeenCalledWith(2);
		expect(missing.status).toBe(404);
		expect(invalid.status).toBe(400);
	});
});
