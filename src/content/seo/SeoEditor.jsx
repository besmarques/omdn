import { useState } from 'react';

import { analyzeSeo } from './analyzeSeo';

function StatusIcon({ status }) {
	return (
		<span aria-label={status === 'pass' ? 'Passed' : status === 'warning' ? 'Needs improvement' : 'Failed'}>
			{status === 'pass' ? '✓' : status === 'warning' ? '!' : '×'}
		</span>
	);
}

export default function SeoEditor({
	content = '',
	description,
	excerpt = '',
	focusKeyword: initialFocusKeyword = '',
	hasImage = false,
	isPillar = false,
	path,
	seoDescription: initialSeoDescription = '',
	seoTitle: initialSeoTitle = '',
	title,
	type = 'post',
}) {
	const [seoTitle, setSeoTitle] = useState(initialSeoTitle ?? '');
	const [seoDescription, setSeoDescription] = useState(initialSeoDescription ?? '');
	const [focusKeyword, setFocusKeyword] = useState(initialFocusKeyword ?? '');
	const previewTitle = seoTitle || (title ? `${title} | O Melhor do Natal` : 'Post title');
	const previewDescription = seoDescription || description || 'Add a description to preview how this page may appear in search results.';
	const analysis = analyzeSeo({
		content,
		description,
		excerpt,
		focusKeyword,
		hasImage,
		seoDescription: previewDescription,
		seoTitle: previewTitle,
		slug: path.split('/').filter(Boolean).at(-1) ?? '',
		type,
	});

	return (
		<fieldset className="grid gap-4">
			<legend className="text-2xl font-semibold">SEO</legend>
			<label>
				<input defaultChecked={isPillar} name="isPillar" type="checkbox" /> This post is pillar content
			</label>
			<label htmlFor="seoTitle">SEO title</label>
			<input
				id="seoTitle"
				name="seoTitle"
				maxLength={255}
				placeholder={title ? `${title} | O Melhor do Natal` : 'Defaults to the post title'}
				value={seoTitle}
				onChange={(event) => setSeoTitle(event.target.value)}
			/>
			<p>{seoTitle.length}/255 characters</p>
			<label htmlFor="seoDescription">Meta description</label>
			<textarea
				id="seoDescription"
				name="seoDescription"
				maxLength={320}
				placeholder="Defaults to the recipe description"
				value={seoDescription}
				onChange={(event) => setSeoDescription(event.target.value)}
			/>
			<p>{seoDescription.length}/320 characters</p>
			<label htmlFor="focusKeyword">Focus keyword</label>
			<input
				id="focusKeyword"
				name="focusKeyword"
				maxLength={500}
				value={focusKeyword}
				onChange={(event) => setFocusKeyword(event.target.value)}
			/>
			<p>Editorial guidance only; this is not emitted as a meta keywords tag.</p>
			<section aria-label="SEO analysis">
				<h3>SEO score: {analysis.score}/100</h3>
				{analysis.groups.map((group) => {
					const problems = group.checks.filter((check) => !check.passed).length;

					return (
						<details key={group.id} open>
							<summary>
								{group.label} — {problems === 0 ? 'All good' : `${problems} to improve`}
							</summary>
							<ul>
								{group.checks.map((check) => (
									<li key={check.id}>
										<StatusIcon status={check.status} /> {check.label}
									</li>
								))}
							</ul>
						</details>
					);
				})}
			</section>
			<section aria-label="Search result preview">
				<h3>Search result preview</h3>
				<p>{`omelhordonatal.pt${path}`}</p>
				<p>{previewTitle}</p>
				<p>{previewDescription}</p>
			</section>
		</fieldset>
	);
}
