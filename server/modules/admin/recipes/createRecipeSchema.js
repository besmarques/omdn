import { z } from 'zod';

const slug = z
	.string()
	.trim()
	.max(200)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Use a lowercase hyphenated slug');
const lineId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

export const createRecipeSchema = z
	.object({
		cookMinutes: z.number().int().nonnegative().max(10_000),
		description: z.string().trim().min(1).max(5000),
		difficulty: z.enum(['easy', 'medium', 'hard']),
		ingredients: z
			.array(
				z.object({
					id: lineId,
					name: z.string().trim().min(1).max(200),
					note: z.string().trim().min(1).max(200).optional(),
					quantity: z.string().trim().min(1).max(200).optional(),
					unit: z.string().trim().min(1).max(200).optional(),
				}),
			)
			.min(1)
			.max(100),
		instructions: z
			.array(
				z.object({
					id: lineId,
					text: z.string().trim().min(1).max(5000),
				}),
			)
			.min(1)
			.max(100),
		prepMinutes: z.number().int().nonnegative().max(10_000),
		publication: z.enum(['draft', 'publish', 'schedule']).default('draft'),
		publishAt: z.string().datetime({ offset: true }).optional(),
		slug: slug.or(z.literal('')).optional(),
		title: z.string().trim().min(1).max(200),
		yield: z.object({
			quantity: z.number().positive().max(1_000_000),
			unit: z.string().trim().min(1).max(200),
		}),
	})
	.strict()
	.superRefine((recipe, context) => {
		if (recipe.publication === 'schedule' && !recipe.publishAt) {
			context.addIssue({ code: 'custom', message: 'Choose a publication date', path: ['publishAt'] });
		}

		if (recipe.publication !== 'schedule' && recipe.publishAt) {
			context.addIssue({ code: 'custom', message: 'A publication date is only valid when scheduling', path: ['publishAt'] });
		}
	});
