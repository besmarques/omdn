import { describe, expect, it } from 'vitest';

import { normalizeSeoInput, seoInputSchema } from './seoSchema';

describe('shared SEO contract', () => {
	it('normalizes empty overrides to post-type defaults', () => {
		expect(normalizeSeoInput({}, { description: 'Default description', title: 'Default title' })).toEqual({
			description: 'Default description',
			focusKeyword: null,
			title: 'Default title',
		});
	});

	it('validates reusable editorial SEO fields', () => {
		expect(seoInputSchema.parse({ description: 'Search description', focusKeyword: 'christmas cake', title: 'Search title' })).toEqual({
			description: 'Search description',
			focusKeyword: 'christmas cake',
			title: 'Search title',
		});
		expect(() => seoInputSchema.parse({ title: 'x'.repeat(256) })).toThrow();
	});
});
