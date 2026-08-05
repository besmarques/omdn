export default function PostEditorFields({
	canPublish,
	description,
	excerpt,
	onDescriptionChange,
	onExcerptChange,
	onPublicationChange,
	onSlugChange,
	onTitleChange,
	publication,
	slug,
	title,
}) {
	return (
		<fieldset className="grid gap-4">
			<legend className="text-2xl font-semibold">Post</legend>
			<label htmlFor="title">Title</label>
			<input id="title" name="title" required maxLength={200} value={title} onChange={onTitleChange} />
			<label htmlFor="slug">Slug</label>
			<input
				id="slug"
				name="slug"
				maxLength={200}
				pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
				placeholder="Generated from the title when left blank"
				value={slug}
				onChange={onSlugChange}
			/>
			<label htmlFor="description">Description</label>
			<textarea id="description" name="description" required maxLength={5000} value={description} onChange={onDescriptionChange} />
			<label htmlFor="excerpt">Excerpt</label>
			<textarea
				id="excerpt"
				name="excerpt"
				maxLength={1000}
				placeholder="Defaults to the description when left blank"
				value={excerpt}
				onChange={onExcerptChange}
			/>
			<section aria-labelledby="featured-image-heading">
				<h2 id="featured-image-heading">Featured image</h2>
				<p>Image selection will be enabled by the shared media library. Arbitrary image URLs are not accepted.</p>
			</section>
			{canPublish && (
				<>
					<label htmlFor="publication">Publication</label>
					<select id="publication" name="publication" value={publication} onChange={onPublicationChange}>
						<option value="draft">Save as draft</option>
						<option value="publish">Publish immediately</option>
						<option value="schedule">Schedule publication</option>
					</select>
					{publication === 'schedule' && (
						<>
							<label htmlFor="publishAt">Publication date and time</label>
							<input id="publishAt" name="publishAt" type="datetime-local" required />
						</>
					)}
				</>
			)}
		</fieldset>
	);
}
