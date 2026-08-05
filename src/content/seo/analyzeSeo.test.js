import { describe, expect, it } from 'vitest';

import { analyzeSeo } from './analyzeSeo';

describe('SEO analysis', () => {
	it('groups deterministic checks and scores the current post', () => {
		const analysis = analyzeSeo({
			content: 'Christmas cake '.repeat(80),
			description: 'Christmas cake instructions.',
			excerpt: 'A festive summary.',
			focusKeyword: 'christmas cake',
			hasImage: true,
			seoDescription: `Christmas cake ${'description '.repeat(10)}`,
			seoTitle: 'Christmas cake recipe for the festive season',
			slug: 'christmas-cake',
			type: 'recipe',
		});

		expect(analysis.groups.map((group) => group.label)).toEqual([
			'Basic SEO',
			'Additional',
			'Title readability',
			'Description readability',
		]);
		expect(analysis.score).toBeGreaterThan(70);
	});
});
