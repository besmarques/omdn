import { createHash } from 'node:crypto';

import { deriveRecipePlainText, parseRecipeArticleSource, serializeRecipeArticleSource } from '#content/recipes/recipeSchema.js';

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

		return repository({
			actor,
			createdAt: now(),
			plainText: deriveRecipePlainText(source),
			publish: input.publish,
			seoTitle: `${source.title} | O Melhor do Natal`,
			slug: input.slug,
			source,
			sourceHash: createHash('sha256').update(serializedSource).digest(),
		});
	};
}
