import { requestApi } from './authApi';

function requireData(result, message) {
	if (!result.ok) throw new Error(result.body?.message ?? message);
	if (!result.body?.data) throw new Error('The server returned invalid article data');
	return result.body.data;
}

export async function getArticle(slug) {
	return requireData(await requestApi(`/api/articles/${encodeURIComponent(slug)}`), 'Unable to load the article');
}

export async function getArticleArchivePage(page) {
	return requireData(await requestApi(`/api/articles/archive?page=${encodeURIComponent(page)}`), 'Unable to load articles');
}
