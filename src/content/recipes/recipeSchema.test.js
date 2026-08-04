import { describe, expect, it } from 'vitest';

import {
	createRecipeStructuredData,
	deriveRecipePlainText,
	parseRecipeArticleSource,
	restoreRecipeArticleSource,
	serializeRecipeArticleSource,
	serializeRecipeStructuredData,
} from './recipeSchema';

const recipe = {
	cookMinutes: 12,
	description: 'Simple biscuits for Christmas.',
	difficulty: 'easy',
	ingredients: [{ id: 'flour', name: 'flour', quantity: '200', unit: 'g' }],
	instructions: [{ id: 'mix', text: 'Combine all ingredients.', title: 'Mix' }],
	kind: 'recipe',
	prepMinutes: 20,
	schemaVersion: 1,
	title: 'Christmas biscuits',
	yield: { quantity: 16, unit: 'biscuits' },
};

describe('recipe article source', () => {
	it('validates and restores a serialized revision without losing data', () => {
		const serialized = serializeRecipeArticleSource(recipe);

		expect(restoreRecipeArticleSource(serialized)).toEqual(parseRecipeArticleSource(recipe));
	});

	it('rejects unsupported schema versions and duplicate item identifiers', () => {
		expect(() => parseRecipeArticleSource({ ...recipe, schemaVersion: 2 })).toThrow();
		expect(() => parseRecipeArticleSource({ ...recipe, difficulty: undefined })).toThrow();
		expect(() => parseRecipeArticleSource({ ...recipe, rawHtml: '<script>alert(1)</script>' })).toThrow();
		expect(() =>
			parseRecipeArticleSource({
				...recipe,
				ingredients: [recipe.ingredients[0], { ...recipe.ingredients[0], name: 'butter' }],
			}),
		).toThrow('ingredients must use unique identifiers');
	});

	it('derives searchable text and schema.org Recipe data from the same source', () => {
		expect(deriveRecipePlainText(recipe)).toContain('200 g flour');
		expect(createRecipeStructuredData(recipe)).toMatchObject({
			'@type': 'Recipe',
			cookTime: 'PT12M',
			name: 'Christmas biscuits',
			recipeIngredient: ['200 g flour'],
			totalTime: 'PT32M',
		});
	});

	it('escapes structured data before placing it inside an HTML script element', () => {
		const serialized = serializeRecipeStructuredData({ ...recipe, description: '</script><script>alert(1)</script>' });

		expect(serialized).not.toContain('</script>');
		expect(JSON.parse(serialized).description).toBe('</script><script>alert(1)</script>');
	});
});
