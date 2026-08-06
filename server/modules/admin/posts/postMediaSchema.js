import { z } from 'zod';

const usageSchema = z.object({ altText: z.string().trim().max(500), id: z.number().int().positive() }).strict();
export const postMediaSchema = z
	.object({
		featured: usageSchema.nullable().default(null),
		gallery: z.array(usageSchema).max(30).default([]),
	})
	.strict()
	.superRefine((media, context) => {
		const ids = media.gallery.map(({ id }) => id);
		if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', message: 'Gallery images must be unique', path: ['gallery'] });
	});
