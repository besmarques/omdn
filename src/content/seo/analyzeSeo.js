function normalized(value) {
	return String(value ?? '')
		.trim()
		.toLocaleLowerCase();
}

function words(value) {
	return normalized(value).split(/\s+/u).filter(Boolean);
}

function result(id, label, passed, level = 'error') {
	return { id, label, passed, status: passed ? 'pass' : level };
}

export function analyzeSeo({ content, description, excerpt, focusKeyword, hasImage, seoDescription, seoTitle, slug, type = 'post' }) {
	const rawSeoTitle = String(seoTitle ?? '');
	const rawSeoDescription = String(seoDescription ?? '');
	const keyword = normalized(focusKeyword);
	const title = normalized(rawSeoTitle);
	const metaDescription = normalized(rawSeoDescription);
	const body = normalized([description, excerpt, content].filter(Boolean).join(' '));
	const wordCount = words(body).length;
	const minimumWords = type === 'recipe' ? 150 : 300;
	const hasKeyword = (value) => Boolean(keyword && normalized(value).includes(keyword));

	const groups = [
		{
			id: 'basic',
			label: 'Basic SEO',
			checks: [
				result('keyword-title', 'Focus keyword appears in the SEO title', hasKeyword(title)),
				result('keyword-description', 'Focus keyword appears in the meta description', hasKeyword(metaDescription)),
				result('keyword-url', 'Focus keyword appears in the URL', hasKeyword(slug)),
				result('keyword-content', 'Focus keyword appears in the content', hasKeyword(body)),
				result(
					'content-length',
					`Content has at least ${minimumWords} words (${wordCount} currently)`,
					wordCount >= minimumWords,
					'warning',
				),
			],
		},
		{
			id: 'additional',
			label: 'Additional',
			checks: [
				result('excerpt', 'A dedicated excerpt is provided', Boolean(normalized(excerpt)), 'warning'),
				result('featured-image', 'A featured image is selected', Boolean(hasImage), 'warning'),
				result('slug-length', 'URL slug is concise (75 characters or fewer)', Boolean(slug) && slug.length <= 75, 'warning'),
			],
		},
		{
			id: 'title-readability',
			label: 'Title readability',
			checks: [
				result('title-present', 'An SEO title is available', Boolean(title)),
				result(
					'title-length',
					`SEO title is between 30 and 60 characters (${rawSeoTitle.length} currently)`,
					rawSeoTitle.length >= 30 && rawSeoTitle.length <= 60,
					'warning',
				),
			],
		},
		{
			id: 'description-readability',
			label: 'Description readability',
			checks: [
				result('description-present', 'A meta description is available', Boolean(metaDescription)),
				result(
					'description-length',
					`Meta description is between 120 and 160 characters (${rawSeoDescription.length} currently)`,
					rawSeoDescription.length >= 120 && rawSeoDescription.length <= 160,
					'warning',
				),
			],
		},
	];
	const checks = groups.flatMap((group) => group.checks);
	const earned = checks.reduce((score, check) => score + (check.passed ? 1 : check.status === 'warning' ? 0.5 : 0), 0);

	return { groups, score: Math.round((earned / checks.length) * 100) };
}
