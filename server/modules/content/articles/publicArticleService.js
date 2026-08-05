import { parseArticleSource } from '#content/articles/articleSchema.js';
import createPublicPostService from '../recipes/publicRecipeService.js';

export default function createPublicArticleService(repository) {
	return createPublicPostService(repository, { parseSource: parseArticleSource, resultKey: 'article' });
}
