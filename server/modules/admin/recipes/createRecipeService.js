import { createHash } from 'node:crypto';

import { deriveRecipePlainText, parseRecipeArticleSource, serializeRecipeArticleSource } from '#content/recipes/recipeSchema.js';
import { derivePostDescriptionText, sanitizePostDescriptionHtml } from '#content/posts/postDescriptionSanitizer.server.js';
import { normalizeSeoInput } from '#content/seo/seoSchema.js';

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
		const descriptionHtml = sanitizePostDescriptionHtml(input.descriptionHtml);
		const description = derivePostDescriptionText(descriptionHtml);
		const source = parseRecipeArticleSource({
			cookMinutes: input.cookMinutes,
			description,
			descriptionHtml,
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
		const publishAt = input.publishAt ? new Date(input.publishAt) : null;
		const seo = normalizeSeoInput(input.seo, {
			description: source.description,
			title: `${source.title} | O Melhor do Natal`,
		});

		if (!slug) {
			throw new TypeError('Recipe title must contain letters or numbers when no slug is provided');
		}

		if (publishAt && publishAt <= now()) {
			throw new RangeError('Scheduled publication must be in the future');
		}

		return repository({
			actor,
			categoryId: input.categoryId,
			tagIds: input.tagIds,
			createdAt: now(),
			excerpt: input.excerpt || source.description,
			isPillar: input.isPillar,
			plainText: deriveRecipePlainText(source),
			publication: input.publication,
			publishAt,
			seo,
			slug,
			source,
			sourceHash: createHash('sha256').update(serializedSource).digest(),
		});
	};
}
