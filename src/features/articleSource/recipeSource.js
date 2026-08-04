import { z } from 'zod';

const itemId = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const shortText = z.string().trim().min(1).max(200);
const optionalShortText = shortText.optional();
const longText = z.string().trim().min(1).max(5000);
const richText = z.string().trim().min(1).max(20000).optional();

const ingredientSchema = z
	.object({
		id: itemId,
		name: shortText,
		note: optionalShortText,
		quantity: optionalShortText,
		unit: optionalShortText,
	})
	.strict();

const instructionSchema = z
	.object({
		id: itemId,
		text: longText,
		title: optionalShortText,
	})
	.strict();

export const recipeArticleSourceSchema = z
	.object({
		cookMinutes: z.number().int().nonnegative(),
		description: longText,
		descriptionHtml: richText,
		ingredients: z.array(ingredientSchema).min(1).max(100),
		instructions: z.array(instructionSchema).min(1).max(100),
		kind: z.literal('recipe'),
		prepMinutes: z.number().int().nonnegative(),
		schemaVersion: z.literal(1),
		title: shortText,
		yield: z
			.object({
				quantity: z.number().positive(),
				unit: shortText,
			})
			.strict(),
	})
	.strict()
	.superRefine((source, context) => {
		for (const field of ['ingredients', 'instructions']) {
			const identifiers = source[field].map(({ id }) => id);

			if (new Set(identifiers).size !== identifiers.length) {
				context.addIssue({
					code: 'custom',
					message: `${field} must use unique identifiers`,
					path: [field],
				});
			}
		}
	});

export function parseRecipeArticleSource(source) {
	return recipeArticleSourceSchema.parse(source);
}

export function serializeRecipeArticleSource(source) {
	return JSON.stringify(parseRecipeArticleSource(source));
}

export function restoreRecipeArticleSource(serializedSource) {
	return parseRecipeArticleSource(JSON.parse(serializedSource));
}

export function formatIngredient(ingredient) {
	return [ingredient.quantity, ingredient.unit, ingredient.name, ingredient.note ? `(${ingredient.note})` : null].filter(Boolean).join(' ');
}

export function deriveRecipePlainText(source) {
	const recipe = parseRecipeArticleSource(source);

	return [
		recipe.title,
		recipe.description,
		...recipe.ingredients.map(formatIngredient),
		...recipe.instructions.flatMap((instruction) => [instruction.title, instruction.text].filter(Boolean)),
	].join('\n');
}

export function createRecipeStructuredData(source) {
	const recipe = parseRecipeArticleSource(source);

	return {
		'@context': 'https://schema.org',
		'@type': 'Recipe',
		cookTime: `PT${recipe.cookMinutes}M`,
		description: recipe.description,
		name: recipe.title,
		prepTime: `PT${recipe.prepMinutes}M`,
		recipeIngredient: recipe.ingredients.map(formatIngredient),
		recipeInstructions: recipe.instructions.map((instruction) => ({
			'@type': 'HowToStep',
			name: instruction.title,
			text: instruction.text,
		})),
		recipeYield: `${recipe.yield.quantity} ${recipe.yield.unit}`,
		totalTime: `PT${recipe.prepMinutes + recipe.cookMinutes}M`,
	};
}

export function serializeRecipeStructuredData(source) {
	return JSON.stringify(createRecipeStructuredData(source)).replaceAll('<', '\\u003c');
}
