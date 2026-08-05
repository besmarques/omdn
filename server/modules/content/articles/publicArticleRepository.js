import createPublicPostRepository from '../recipes/publicRecipeRepository.js';

export default function createPublicArticleRepository(db) {
	return createPublicPostRepository(db, { contentType: 'article' });
}
