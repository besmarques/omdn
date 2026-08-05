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
		publish: z.boolean().default(false),
		slug,
		title: z.string().trim().min(1).max(200),
		yield: z.object({
			quantity: z.number().positive().max(1_000_000),
			unit: z.string().trim().min(1).max(200),
		}),
	})
	.strict();
