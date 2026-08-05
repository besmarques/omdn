import { createRecipeStructuredData } from '../recipes/recipeSchema';

const structuredDataBuilders = Object.freeze({
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
