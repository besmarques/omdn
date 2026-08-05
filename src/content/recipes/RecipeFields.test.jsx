import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import RecipeFields from './RecipeFields';

describe('recipe editor fields', () => {
	it('renders the recipe-only content and metadata controls', () => {
		const html = renderToStaticMarkup(
			<RecipeFields ingredients="1 | kg | flour" instructions="Mix." onIngredientsChange={vi.fn()} onInstructionsChange={vi.fn()} />,
		);

		for (const name of ['ingredients', 'instructions', 'prepMinutes', 'cookMinutes', 'difficulty', 'yieldQuantity', 'yieldUnit']) {
			expect(html).toContain(`name="${name}"`);
		}
	});
});
