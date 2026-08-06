import PostDescriptionEditor from './PostDescriptionEditor';

import FormField from '../../components/forms/FormField';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

export default function PostMainFields({
	description,
	descriptionHtml,
	excerpt,
	onDescriptionHtmlChange,
	onExcerptChange,
	onSlugChange,
	onTitleChange,
	slug,
	title,
}) {
	return (
		<fieldset className="grid gap-4">
			<legend className="text-2xl font-semibold">
				Post
			</legend>

			<FormField label="Title" name="title">
				<Input
					id="title"
					name="title"
					required
					maxLength={200}
					value={title}
					onChange={onTitleChange}
				/>
			</FormField>

			<FormField
				label="Slug"
				name="slug"
				description="Generated from the title when left blank"
			>
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

			<input
				name="description"
				type="hidden"
				value={description}
			/>

			<input
				name="descriptionHtml"
				type="hidden"
				value={descriptionHtml}
			/>

			<PostDescriptionEditor
				initialValue={descriptionHtml}
				onChange={onDescriptionHtmlChange}
			/>

			<FormField
				label="Excerpt"
				name="excerpt"
				description="Defaults to the description when left blank"
			>
				<Textarea
					id="excerpt"
					name="excerpt"
					maxLength={1000}
					placeholder="Defaults to the description when left blank"
					value={excerpt}
					onChange={onExcerptChange}
				/>
			</FormField>
		</fieldset>
	);
}
