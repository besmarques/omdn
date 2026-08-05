import { createRecipeStructuredData } from '../recipes/recipeSchema';
import { createArticleStructuredData } from '../articles/articleSchema';

const structuredDataBuilders = Object.freeze({
	article: createArticleStructuredData,
	recipe: createRecipeStructuredData,
});

export function createPostStructuredData(contentType, source, metadata) {
	const builder = structuredDataBuilders[contentType];

	if (!builder) {
		throw new TypeError(`Unsupported structured-data content type: ${contentType}`);
	}

	return builder(source, metadata);
}

export function supportsStructuredData(contentType) {
	return Object.hasOwn(structuredDataBuilders, contentType);
}
