import { describe, expect, it } from 'vitest';

import { derivePostDescriptionText, sanitizePostDescriptionHtml } from './postDescriptionSanitizer.server';

describe('post description sanitizer', () => {
	it('keeps the editor allowlist and removes executable markup', () => {
		const unsafe = '<p onclick="alert(1)"><strong>Safe</strong><script>alert(1)</script> <a href="javascript:alert(1)">link</a></p>';

		expect(sanitizePostDescriptionHtml(unsafe)).toBe('<p><strong>Safe</strong> <a rel="noopener noreferrer">link</a></p>');
		expect(derivePostDescriptionText(unsafe)).toBe('Safe link');
	});
});
