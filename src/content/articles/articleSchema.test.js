import { describe, expect, it } from 'vitest';
import { createArticleStructuredData, deriveArticlePlainText, parseArticleSource } from './articleSchema';

const article = { description: 'A festive story.', kind: 'article', schemaVersion: 1, title: 'Christmas traditions' };

describe('article source schema', () => {
	it('validates source and creates article structured data', () => {
		expect(parseArticleSource(article)).toEqual(article);
		expect(deriveArticlePlainText(article)).toContain('A festive story.');
		expect(createArticleStructuredData(article, { author: 'Maria', url: 'https://example.com/articles/traditions' })).toMatchObject({
			'@type': 'Article',
			headline: article.title,
			mainEntityOfPage: 'https://example.com/articles/traditions',
		});
	});

	it('rejects recipe source data', () => {
		expect(() => parseArticleSource({ ...article, kind: 'recipe' })).toThrow();
	});
});
