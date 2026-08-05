import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMedia, getMediaSettings, updateMediaSettings, uploadMedia } from '../api/mediaApi';

export const mediaKey = ['admin', 'media'];
export const mediaSettingsKey = ['admin', 'media', 'settings'];
function useMediaQuery(key, request, fallback) {
	return useQuery({
		meta: { private: true },
		queryKey: key,
		queryFn: async () => {
			const result = await request();
			if (!result.ok) throw new Error(result.body?.message ?? fallback);
			return result.body.data;
		},
	});
}
export const useMedia = () => useMediaQuery(mediaKey, getMedia, 'Unable to load media');
export const useMediaSettings = () => useMediaQuery(mediaSettingsKey, getMediaSettings, 'Unable to load media settings');
export function useUploadMedia() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: uploadMedia,
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: mediaKey }) : undefined),
	});
}
export function useUpdateMediaSettings() {
	const client = useQueryClient();
	return useMutation({
		mutationFn: updateMediaSettings,
		onSuccess: (result) => (result.ok ? client.invalidateQueries({ queryKey: mediaSettingsKey }) : undefined),
	});
}
