import { z } from 'zod';

import { seoInputSchema } from '#content/seo/seoSchema.js';
import { postMediaSchema } from '../posts/postMediaSchema.js';

const slug = z
	.string()
	.trim()
	.max(200)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Use a lowercase hyphenated slug');
const lineId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

export const createRecipeSchema = z
	.object({
		categoryId: z.number().int().positive().optional(),
		tagIds: z.array(z.number().int().positive()).max(50).default([]),
		cookMinutes: z.number().int().nonnegative().max(10_000),
		description: z.string().trim().min(1).max(5000),
		descriptionHtml: z.string().trim().min(1).max(20000),
		excerpt: z.string().trim().max(1000).optional(),
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
		isPillar: z.boolean().default(false),
		media: postMediaSchema.default({ featured: null, gallery: [] }),
		publication: z.enum(['draft', 'publish', 'schedule']).default('draft'),
		publishAt: z.string().datetime({ offset: true }).optional(),
		seo: seoInputSchema,
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
