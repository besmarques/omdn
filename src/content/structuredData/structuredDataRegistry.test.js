import { describe, expect, it } from 'vitest';

import { createPostStructuredData, supportsStructuredData } from './structuredDataRegistry';

const recipe = {
	cookMinutes: 20,
	description: 'A festive cake.',
	difficulty: 'easy',
	ingredients: [{ id: 'flour', name: 'flour' }],
	instructions: [{ id: 'mix', text: 'Mix.' }],
	kind: 'recipe',
	prepMinutes: 10,
	schemaVersion: 1,
	title: 'Christmas cake',
	yield: { quantity: 8, unit: 'slices' },
};

describe('structured-data registry', () => {
	it('selects the builder from the persisted post content type', () => {
		expect(createPostStructuredData('recipe', recipe, { author: 'Maria' })).toMatchObject({
			'@type': 'Recipe',
			author: { name: 'Maria' },
		});
		expect(supportsStructuredData('recipe')).toBe(true);
		expect(supportsStructuredData('article')).toBe(false);
	});

	it('rejects an unregistered content type', () => {
		expect(() => createPostStructuredData('article', {}, {})).toThrow('Unsupported structured-data content type');
	});
});
