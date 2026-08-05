import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRecipe } from '../../../api/adminRecipeApi';
import { getRecipe, getRecipeArchivePage } from '../../../api/recipeApi';

export const recipeQueryKeys = Object.freeze({
	all: Object.freeze(['recipes']),
	archive: (page) => ['recipes', 'archive', { page }],
	detail: (slug) => ['recipes', 'detail', slug],
});

export function recipeArchiveQueryOptions(page) {
	return queryOptions({
		placeholderData: keepPreviousData,
		queryKey: recipeQueryKeys.archive(page),
		queryFn: () => getRecipeArchivePage(page),
		staleTime: 60_000,
	});
}

export function recipeDetailQueryOptions(slug) {
	return queryOptions({
		queryKey: recipeQueryKeys.detail(slug),
		queryFn: () => getRecipe(slug),
		staleTime: 60_000,
	});
}

export function useRecipeArchive(page, initialData) {
	return useQuery({ ...recipeArchiveQueryOptions(page), initialData });
}

export function useRecipe(slug, initialData) {
	return useQuery({ ...recipeDetailQueryOptions(slug), initialData });
}

export function createRecipeMutationOptions(queryClient) {
	return {
		mutationFn: createRecipe,
		onSuccess: (result) =>
			result.ok && result.body?.data?.publication === 'publish'
				? queryClient.invalidateQueries({ queryKey: recipeQueryKeys.all })
				: undefined,
	};
}

export function useCreateRecipeMutation() {
	const queryClient = useQueryClient();

	return useMutation(createRecipeMutationOptions(queryClient));
}
