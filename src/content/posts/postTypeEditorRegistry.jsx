import RecipeFields from '../recipes/RecipeFields';

const postTypeEditorRegistry = Object.freeze({
	article: Object.freeze({
		MainFields: null,
		SidebarFields: null,
	}),

	recipe: Object.freeze({
		MainFields: RecipeFields,
		SidebarFields: null,
	}),
});

export function getPostTypeEditorDefinition(contentType) {
	const definition = postTypeEditorRegistry[contentType];

	if (!definition) {
		throw new TypeError(
			`Unsupported post editor content type: ${contentType}`,
		);
	}

	return definition;
}

export function supportsPostTypeEditor(contentType) {
	return Object.hasOwn(postTypeEditorRegistry, contentType);
}

export { postTypeEditorRegistry };
