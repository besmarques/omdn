import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createArticle } from '../../../api/adminArticleApi';
import { getArticle, getArticleArchivePage } from '../../../api/articleApi';

export const articleQueryKeys = Object.freeze({
	all: Object.freeze(['articles']),
	archive: (page) => ['articles', 'archive', { page }],
	detail: (slug) => ['articles', 'detail', slug],
});
export function useArticleArchive(page, initialData) {
	return useQuery({
		...queryOptions({
			placeholderData: keepPreviousData,
			queryKey: articleQueryKeys.archive(page),
			queryFn: () => getArticleArchivePage(page),
			staleTime: 60_000,
		}),
		initialData,
	});
}
export function useArticle(slug, initialData) {
	return useQuery({ queryKey: articleQueryKeys.detail(slug), queryFn: () => getArticle(slug), staleTime: 60_000, initialData });
}
export function useCreateArticleMutation() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: createArticle,
		onSuccess: (result) =>
			result.ok && result.body?.data?.publication === 'publish' ? client.invalidateQueries({ queryKey: articleQueryKeys.all }) : undefined,
	});
}
