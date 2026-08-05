import { useState } from 'react';

export default function SeoEditor({ description, path, title }) {
	const [seoTitle, setSeoTitle] = useState('');
	const [seoDescription, setSeoDescription] = useState('');
	const previewTitle = seoTitle || title || 'Post title';
	const previewDescription = seoDescription || description || 'Add a description to preview how this page may appear in search results.';

	return (
		<fieldset className="grid gap-4">
			<legend className="text-2xl font-semibold">SEO</legend>
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
			<input id="focusKeyword" name="focusKeyword" maxLength={500} />
			<p>Editorial guidance only; this is not emitted as a meta keywords tag.</p>
			<section aria-label="Search result preview">
				<h3>Search result preview</h3>
				<p>{`omelhordonatal.pt${path}`}</p>
				<p>{previewTitle}</p>
				<p>{previewDescription}</p>
			</section>
		</fieldset>
	);
}
