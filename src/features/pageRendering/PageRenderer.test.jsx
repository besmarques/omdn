import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import PageRenderer from './PageRenderer';

const sharedPresentation = {
	footer: { type: 'standard' },
	header: { type: 'minimal' },
};

describe('PageRenderer', () => {
	it('combines the recipe template with the sidebar layout and its blocks', () => {
		const html = renderToStaticMarkup(
			<PageRenderer
				page={{
					content: {
						ingredients: ['Flour'],
						instructions: ['Mix'],
						preparationTime: '10 minutes',
						title: 'Biscuits',
					},
					presentation: {
						...sharedPresentation,
						layout: 'sidebar',
						sidebar: [
							{
								id: 'newsletter',
								settings: { description: 'Weekly ideas', title: 'Newsletter' },
								type: 'newsletter',
							},
						],
						template: 'recipe',
					},
				}}
			/>,
		);

		expect(html).toContain('<aside aria-label="Related content">');
		expect(html).toContain('<h1>Biscuits</h1>');
		expect(html).toContain('<h2>Newsletter</h2>');
	});

	it('combines the gift template with the full-width layout', () => {
		const html = renderToStaticMarkup(
			<PageRenderer
				page={{
					content: {
						ideas: [{ id: 'book', name: 'Book', description: 'A good book', budget: '€20' }],
						introduction: 'Suggestions',
						title: 'Gift ideas',
					},
					presentation: {
						...sharedPresentation,
						layout: 'full-width',
						template: 'gift-ideas',
					},
				}}
			/>,
		);

		expect(html).toContain('<h1>Gift ideas</h1>');
		expect(html).toContain('<h2>Book</h2>');
		expect(html).not.toContain('<aside');
	});

	it('rejects component identifiers that are not in the trusted registry', () => {
		expect(() =>
			renderToStaticMarkup(
				<PageRenderer
					page={{
						content: { title: 'Unsafe page' },
						presentation: {
							...sharedPresentation,
							layout: 'arbitrary-component-path',
							template: 'recipe',
						},
					}}
				/>,
			),
		).toThrow('Unknown page presentation layouts: arbitrary-component-path');
	});
});
