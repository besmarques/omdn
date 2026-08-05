import { requestApi } from './authApi';

export function getAdminContentType(contentType) {
	return requestApi(`/api/admin/content-types/${contentType}`);
}
export function createAdminCategory(contentType, category) {
	return requestApi(`/api/admin/content-types/${contentType}/categories`, { method: 'POST', body: JSON.stringify(category) });
}
export function updateArchiveSeo(contentType, seo) {
	return requestApi(`/api/admin/content-types/${contentType}/archive-seo`, { method: 'PATCH', body: JSON.stringify(seo) });
}
