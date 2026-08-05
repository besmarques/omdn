import { createHash } from 'node:crypto';

import { deriveRecipePlainText, parseRecipeArticleSource, serializeRecipeArticleSource } from '#content/recipes/recipeSchema.js';

export function slugifyRecipeTitle(title) {
	return title
		.normalize('NFD')
		.replace(/\p{Mark}+/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.slice(0, 200)
		.replace(/-+$/gu, '');
}

export default function createRecipeService(repository, { now = () => new Date() } = {}) {
	return async function createRecipe(input, actor) {
		const source = parseRecipeArticleSource({
			cookMinutes: input.cookMinutes,
			description: input.description,
			difficulty: input.difficulty,
			ingredients: input.ingredients,
			instructions: input.instructions,
			kind: 'recipe',
			prepMinutes: input.prepMinutes,
			schemaVersion: 1,
			title: input.title,
			yield: input.yield,
		});
		const serializedSource = serializeRecipeArticleSource(source);

		const slug = input.slug || slugifyRecipeTitle(source.title);

		if (!slug) {
			throw new TypeError('Recipe title must contain letters or numbers when no slug is provided');
		}

		return repository({
			actor,
			createdAt: now(),
			plainText: deriveRecipePlainText(source),
			publish: input.publish,
			seoTitle: `${source.title} | O Melhor do Natal`,
			slug,
			source,
			sourceHash: createHash('sha256').update(serializedSource).digest(),
		});
	};
}
