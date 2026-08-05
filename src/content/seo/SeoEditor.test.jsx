import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import SeoEditor from './SeoEditor';

describe('SEO editor', () => {
	it('renders reusable fields and a search preview with content defaults', () => {
		const html = renderToStaticMarkup(<SeoEditor description="Recipe description" path="/recipes/christmas-cake" title="Christmas cake" />);

		expect(html).toContain('name="seoTitle"');
		expect(html).toContain('name="seoDescription"');
		expect(html).toContain('name="focusKeyword"');
		expect(html).toContain('omelhordonatal.pt/recipes/christmas-cake');
		expect(html).toContain('Recipe description');
	});
});
