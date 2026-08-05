import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAdminCategory, getAdminContentType, updateArchiveSeo } from '../api/adminContentTypeApi';

export const adminContentTypeKey = (contentType) => ['admin', 'content-type', contentType];
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
export function useUpdateArchiveSeo(contentType) {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (seo) => updateArchiveSeo(contentType, seo),
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: adminContentTypeKey(contentType) }) : undefined),
	});
}
