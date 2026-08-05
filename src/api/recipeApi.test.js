import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./authApi', () => ({ requestApi: vi.fn() }));

import { requestApi } from './authApi';
import { getRecipe, getRecipeArchivePage } from './recipeApi';

describe('recipe API', () => {
	beforeEach(() => vi.clearAllMocks());

	it('loads encoded detail and numbered archive URLs', async () => {
		requestApi
			.mockResolvedValueOnce({ ok: true, body: { data: { slug: 'bolo-rei' } } })
			.mockResolvedValueOnce({ ok: true, body: { data: { items: [], page: 2 } } });

		await expect(getRecipe('bolo-rei')).resolves.toEqual({ slug: 'bolo-rei' });
		await expect(getRecipeArchivePage(2)).resolves.toEqual({ items: [], page: 2 });
		expect(requestApi).toHaveBeenNthCalledWith(1, '/api/recipes/bolo-rei');
		expect(requestApi).toHaveBeenNthCalledWith(2, '/api/recipes/archive?page=2');
	});

	it('rejects failed or malformed responses', async () => {
		requestApi.mockResolvedValueOnce({ ok: false, body: { message: 'Missing' } });
		await expect(getRecipe('missing')).rejects.toThrow('Missing');

		requestApi.mockResolvedValueOnce({ ok: true, body: {} });
		await expect(getRecipeArchivePage(1)).rejects.toThrow('invalid recipe data');
	});
});
