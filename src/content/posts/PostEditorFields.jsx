import PostDescriptionEditor from './PostDescriptionEditor';

import FormField from '../../components/forms/FormField';
import { Input } from '../../components/ui/input';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import { Textarea } from '../../components/ui/textarea';

export default function PostEditorFields({
	canPublish,
	description,
	descriptionHtml,
	excerpt,
	onDescriptionHtmlChange,
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
			<FormField label="Title" name="title">
				<Input id="title" name="title" required maxLength={200} value={title} onChange={onTitleChange} />
			</FormField>
			<FormField label="Slug" name="slug" description="Generated from the title when left blank">
				<Input
					id="slug"
					name="slug"
					maxLength={200}
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
					placeholder="Generated from the title when left blank"
					value={slug}
					onChange={onSlugChange}
				/>
			</FormField>
			<p id="description-label">Description</p>
			<input name="description" type="hidden" value={description} />
			<input name="descriptionHtml" type="hidden" value={descriptionHtml} />
			<PostDescriptionEditor initialValue={descriptionHtml} onChange={onDescriptionHtmlChange} />
			<FormField label="Excerpt" name="excerpt" description="Defaults to the description when left blank">
				<Textarea
					id="excerpt"
					name="excerpt"
					maxLength={1000}
					placeholder="Defaults to the description when left blank"
					value={excerpt}
					onChange={onExcerptChange}
				/>
			</FormField>
			<section aria-labelledby="featured-image-heading">
				<h2 id="featured-image-heading">Featured image</h2>
				<p>Image selection will be enabled by the shared media library. Arbitrary image URLs are not accepted.</p>
			</section>
			{canPublish && (
				<>
					<FormField label="Publication" name="publication">
						<NativeSelect id="publication" name="publication" value={publication} onChange={onPublicationChange}>
							<NativeSelectOption value="draft">Save as draft</NativeSelectOption>
							<NativeSelectOption value="publish">Publish immediately</NativeSelectOption>
							<NativeSelectOption value="schedule">Schedule publication</NativeSelectOption>
						</NativeSelect>
					</FormField>
					{publication === 'schedule' && (
						<FormField label="Publication date and time" name="publishAt">
							<Input id="publishAt" name="publishAt" type="datetime-local" required />
						</FormField>
					)}
				</>
			)}
		</fieldset>
	);
}
