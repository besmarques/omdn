import { requestApi } from './authApi';

export function createArticle(article) {
	return requestApi('/api/admin/articles', { method: 'POST', body: JSON.stringify(article) });
}
