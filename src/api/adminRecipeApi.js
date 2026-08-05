import { requestApi } from './authApi';

export function createRecipe(recipe) {
	return requestApi('/api/admin/recipes', {
		method: 'POST',
		body: JSON.stringify(recipe),
	});
}
