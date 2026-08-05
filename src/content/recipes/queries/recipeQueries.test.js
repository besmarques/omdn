import { describe, expect, it, vi } from 'vitest';

import { createRecipeMutationOptions, recipeArchiveQueryOptions, recipeDetailQueryOptions, recipeQueryKeys } from './recipeQueries';

describe('recipe queries', () => {
	it('builds stable, targeted archive and detail keys', () => {
		expect(recipeQueryKeys.archive(2)).toEqual(['recipes', 'archive', { page: 2 }]);
		expect(recipeQueryKeys.detail('biscuits')).toEqual(['recipes', 'detail', 'biscuits']);
		expect(recipeArchiveQueryOptions(2).queryKey).toEqual(recipeQueryKeys.archive(2));
		expect(recipeDetailQueryOptions('biscuits').queryKey).toEqual(recipeQueryKeys.detail('biscuits'));
	});

	it('uses a measured public-content stale window', () => {
		expect(recipeArchiveQueryOptions(1).staleTime).toBe(60_000);
		expect(recipeDetailQueryOptions('biscuits').staleTime).toBe(60_000);
	});

	it('invalidates only the recipe prefix after publishing', async () => {
		const queryClient = { invalidateQueries: vi.fn().mockResolvedValue(undefined) };
		const options = createRecipeMutationOptions(queryClient);

		await options.onSuccess({ ok: true, body: { data: { publication: 'publish' } } });
		expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: recipeQueryKeys.all });

		queryClient.invalidateQueries.mockClear();
		expect(options.onSuccess({ ok: true, body: { data: { publication: 'draft' } } })).toBeUndefined();
		expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
	});
});
