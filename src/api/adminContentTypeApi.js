import { requestApi } from './authApi';

export function getAdminContentType(contentType) {
	return requestApi(`/api/admin/content-types/${contentType}`);
}
export function createAdminCategory(contentType, category) {
	return requestApi(`/api/admin/content-types/${contentType}/categories`, { method: 'POST', body: JSON.stringify(category) });
}
export function createAdminTag(contentType, tag) {
	return requestApi(`/api/admin/content-types/${contentType}/tags`, { method: 'POST', body: JSON.stringify(tag) });
}
export function updateArchiveSeo(contentType, seo) {
	return requestApi(`/api/admin/content-types/${contentType}/archive-seo`, { method: 'PATCH', body: JSON.stringify(seo) });
}
export function getAdminPost(contentType, id) {
	return requestApi(`/api/admin/content-types/${contentType}/posts/${id}`);
}
export function updateAdminPost(contentType, id, post) {
	return requestApi(`/api/admin/content-types/${contentType}/posts/${id}`, { method: 'PUT', body: JSON.stringify(post) });
}
export function transitionAdminPost(contentType, id, action, input) {
	return requestApi(`/api/admin/content-types/${contentType}/posts/${id}/actions/${action}`, {
		method: 'POST',
		body: JSON.stringify(input),
	});
}
export function updateAdminTaxonomy(contentType, taxonomy, id, value) {
	return requestApi(`/api/admin/content-types/${contentType}/${taxonomy}/${id}`, { method: 'PUT', body: JSON.stringify(value) });
}
export function deleteAdminTaxonomy(contentType, taxonomy, id) {
	return requestApi(`/api/admin/content-types/${contentType}/${taxonomy}/${id}`, { method: 'DELETE' });
}
