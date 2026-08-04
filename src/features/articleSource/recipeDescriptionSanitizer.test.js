import { describe, expect, it } from 'vitest';

import { sanitizeRecipeDescriptionHtml } from './recipeDescriptionSanitizer.server';

describe('recipe description sanitizer', () => {
	it('keeps the editor allowlist and removes executable markup', () => {
		const unsafe = '<p onclick="alert(1)"><strong>Safe</strong><script>alert(1)</script> <a href="javascript:alert(1)">link</a></p>';

		expect(sanitizeRecipeDescriptionHtml(unsafe)).toBe('<p><strong>Safe</strong> <a rel="noopener noreferrer">link</a></p>');
	});

	it('preserves safe links while adding defensive link attributes', () => {
		expect(sanitizeRecipeDescriptionHtml('<p><a href="https://example.com" target="_blank">Example</a></p>')).toBe(
			'<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Example</a></p>',
		);
	});
});
