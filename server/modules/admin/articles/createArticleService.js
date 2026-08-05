import { createHash } from 'node:crypto';
import { deriveArticlePlainText, parseArticleSource, serializeArticleSource } from '#content/articles/articleSchema.js';
import { derivePostDescriptionText, sanitizePostDescriptionHtml } from '#content/posts/postDescriptionSanitizer.server.js';
import { normalizeSeoInput } from '#content/seo/seoSchema.js';
import { slugifyRecipeTitle } from '../recipes/createRecipeService.js';

export default function createArticleService(repository, { now = () => new Date() } = {}) {
	return async function createArticle(input, actor) {
		const descriptionHtml = sanitizePostDescriptionHtml(input.descriptionHtml);
		const source = parseArticleSource({
			description: derivePostDescriptionText(descriptionHtml),
			descriptionHtml,
			kind: 'article',
			schemaVersion: 1,
			title: input.title,
		});
		const slug = input.slug || slugifyRecipeTitle(source.title);
		const publishAt = input.publishAt ? new Date(input.publishAt) : null;
		if (!slug) throw new TypeError('Article title must contain letters or numbers when no slug is provided');
		if (publishAt && publishAt <= now()) throw new RangeError('Scheduled publication must be in the future');
		return repository({
			actor,
			categoryId: input.categoryId,
			tagIds: input.tagIds,
			createdAt: now(),
			excerpt: input.excerpt || source.description,
			isPillar: input.isPillar,
			plainText: deriveArticlePlainText(source),
			publication: input.publication,
			publishAt,
			slug,
			source,
			seo: normalizeSeoInput(input.seo, { description: source.description, title: `${source.title} | O Melhor do Natal` }),
			sourceHash: createHash('sha256').update(serializeArticleSource(source)).digest(),
		});
	};
}
