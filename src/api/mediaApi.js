import { requestApi } from './authApi';

export const getMedia = () => requestApi('/api/admin/media');
export const getMediaSettings = () => requestApi('/api/admin/media/settings');
export const uploadMedia = (form) => requestApi('/api/admin/media', { body: form, method: 'POST' });
export const updateMediaSettings = (settings) => requestApi('/api/admin/media/settings', { body: JSON.stringify(settings), method: 'PUT' });
