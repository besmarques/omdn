import { z } from 'zod';

const optionalTrimmedString = (maximumLength) => z.string().trim().max(maximumLength).optional();

export const seoInputSchema = z
	.object({
		description: optionalTrimmedString(320),
		focusKeyword: optionalTrimmedString(500),
		title: optionalTrimmedString(255),
	})
	.strict()
	.default({});

export function normalizeSeoInput(seo, defaults) {
	const input = seo ?? {};

	return {
		description: input.description || defaults.description,
		focusKeyword: input.focusKeyword || null,
		title: input.title || defaults.title,
	};
}
