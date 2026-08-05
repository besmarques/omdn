import { requestApi } from './authApi';

function requireData(result, fallbackMessage) {
	if (!result.ok) throw new Error(result.body?.message ?? fallbackMessage);
	if (!result.body?.data) throw new Error('The server returned invalid recipe data');

	return result.body.data;
}

export async function getRecipe(slug) {
	const result = await requestApi(`/api/recipes/${encodeURIComponent(slug)}`);
	return requireData(result, 'Unable to load the recipe');
}

export async function getRecipeArchivePage(page) {
	const result = await requestApi(`/api/recipes/archive?page=${encodeURIComponent(page)}`);
	return requireData(result, 'Unable to load recipes');
}
