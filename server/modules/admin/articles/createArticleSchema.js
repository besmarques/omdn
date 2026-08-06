import { z } from 'zod';
import { seoInputSchema } from '#content/seo/seoSchema.js';
import { postMediaSchema } from '../posts/postMediaSchema.js';

const slug = z
	.string()
	.trim()
	.max(200)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Use a lowercase hyphenated slug');

export const createArticleSchema = z
	.object({
		categoryId: z.number().int().positive().optional(),
		tagIds: z.array(z.number().int().positive()).max(50).default([]),
		description: z.string().trim().min(1).max(5000),
		descriptionHtml: z.string().trim().min(1).max(20000),
		excerpt: z.string().trim().max(1000).optional(),
		isPillar: z.boolean().default(false),
		media: postMediaSchema.default({ featured: null, gallery: [] }),
		publication: z.enum(['draft', 'publish', 'schedule']).default('draft'),
		publishAt: z.string().datetime({ offset: true }).optional(),
		seo: seoInputSchema,
		slug: slug.or(z.literal('')).optional(),
		title: z.string().trim().min(1).max(200),
	})
	.strict()
	.superRefine((article, context) => {
		if (article.publication === 'schedule' && !article.publishAt)
			context.addIssue({ code: 'custom', message: 'Choose a publication date', path: ['publishAt'] });
		if (article.publication !== 'schedule' && article.publishAt)
			context.addIssue({ code: 'custom', message: 'A publication date is only valid when scheduling', path: ['publishAt'] });
	});
