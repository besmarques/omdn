import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	createAdminCategory,
	createAdminTag,
	deleteAdminTaxonomy,
	getAdminContentType,
	getAdminPost,
	transitionAdminPost,
	updateAdminPost,
	updateAdminTaxonomy,
	updateArchiveSeo,
} from '../api/adminContentTypeApi';

export const adminContentTypeKey = (contentType) => ['admin', 'content-type', contentType];
export const adminPostKey = (contentType, id) => ['admin', 'content-type', contentType, 'post', id];
export function useAdminContentType(contentType) {
	return useQuery(
		queryOptions({
			meta: { private: true },
			queryKey: adminContentTypeKey(contentType),
			queryFn: async () => {
				const result = await getAdminContentType(contentType);
				if (!result.ok) throw new Error(result.body?.message ?? 'Unable to load content');
				return result.body.data;
			},
		}),
	);
}
export function useCreateCategory(contentType) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (category) => createAdminCategory(contentType, category),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
export function useCreateTag(contentType) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (tag) => createAdminTag(contentType, tag),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
export function useUpdateArchiveSeo(contentType) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (seo) => updateArchiveSeo(contentType, seo),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
export function useAdminPost(contentType, id) {
	return useQuery({
		meta: { private: true },
		queryKey: adminPostKey(contentType, id),
		queryFn: async () => {
			const result = await getAdminPost(contentType, id);
			if (!result.ok) throw new Error(result.body?.message ?? 'Unable to load post');
			return result.body.data;
		},
	});
}
export function useUpdateAdminPost(contentType, id) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (post) => updateAdminPost(contentType, id, post),
		onSuccess: (result) => {
			if (result.ok) {
				client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) });
				client.invalidateQueries({ queryKey: adminPostKey(contentType, id) });
			}
		},
	});
}
export function useTransitionAdminPost(contentType) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({ action, id, input }) => transitionAdminPost(contentType, id, action, input),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
export function useUpdateTaxonomy(contentType, taxonomy) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({ id, value }) => updateAdminTaxonomy(contentType, taxonomy, id, value),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
export function useDeleteTaxonomy(contentType, taxonomy) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (id) => deleteAdminTaxonomy(contentType, taxonomy, id),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
