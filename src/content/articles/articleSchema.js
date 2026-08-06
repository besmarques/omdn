import { z } from 'zod';

export const articleSourceSchema = z
	.object({
		description: z.string().trim().min(1).max(5000),
		descriptionHtml: z.string().trim().min(1).max(20000).optional(),
		kind: z.literal('article'),
		schemaVersion: z.literal(1),
		title: z.string().trim().min(1).max(200),
	})
	.strict();

export function parseArticleSource(source) {
	return articleSourceSchema.parse(source);
}

export function serializeArticleSource(source) {
	return JSON.stringify(parseArticleSource(source));
}

export function deriveArticlePlainText(source) {
	const article = parseArticleSource(source);
	return `${article.title}\n${article.description}`;
}

export function createArticleStructuredData(source, metadata = {}) {
	const article = parseArticleSource(source);
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		...(metadata.author ? { author: { '@type': 'Person', name: metadata.author } } : {}),
		...(metadata.datePublished ? { datePublished: metadata.datePublished } : {}),
		description: article.description,
		headline: article.title,
		...(metadata.images?.length ? { image: metadata.images } : {}),
		...(metadata.url ? { mainEntityOfPage: metadata.url, url: metadata.url } : {}),
	};
}
