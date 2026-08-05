import createPostRepository from '../recipes/createRecipeRepository.js';

export default function createArticleRepository(db) {
	return createPostRepository(db, { contentType: 'article', templateKey: 'article' });
}
