import FormField from '../../components/forms/FormField';
import { Input } from '../../components/ui/input';
import {
	NativeSelect,
	NativeSelectOption,
} from '../../components/ui/native-select';

export default function PostEditorSidebarFields({
	canPublish,
	categories = [],
	onPublicationChange,
	publication,
	selectedCategoryId,
	selectedTagIds = [],
	tags = [],
}) {
	return (
		<>
			<fieldset className="grid gap-4 rounded-lg border p-4">
				<legend className="px-2 text-lg font-semibold">
					Publication
				</legend>

				{canPublish ? (
					<>
						<FormField
							label="Publication"
							name="publication"
						>
							<NativeSelect
								id="publication"
								name="publication"
								value={publication}
								onChange={onPublicationChange}
							>
								<NativeSelectOption value="draft">
									Save as draft
								</NativeSelectOption>

								<NativeSelectOption value="publish">
									Publish immediately
								</NativeSelectOption>

								<NativeSelectOption value="schedule">
									Schedule publication
								</NativeSelectOption>
							</NativeSelect>
						</FormField>

						{publication === 'schedule' && (
							<FormField
								label="Publication date and time"
								name="publishAt"
							>
								<Input
									id="publishAt"
									name="publishAt"
									type="datetime-local"
									required
								/>
							</FormField>
						)}
					</>
				) : (
					<p className="text-sm text-muted-foreground">
						Publication is managed from the content list.
					</p>
				)}
			</fieldset>

			<fieldset className="grid gap-4 rounded-lg border p-4">
				<legend className="px-2 text-lg font-semibold">
					Taxonomy
				</legend>

				<FormField label="Category" name="categoryId">
					<NativeSelect
						id="categoryId"
						name="categoryId"
						defaultValue={
							selectedCategoryId
								? String(selectedCategoryId)
								: ''
						}
					>
						<NativeSelectOption value="">
							No category
						</NativeSelectOption>

						{categories.map((category) => (
							<NativeSelectOption
								key={category.id}
								value={String(category.id)}
							>
								{category.name}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</FormField>

				{tags.length > 0 && (
					<fieldset className="grid gap-2">
						<legend className="text-sm font-medium">
							Tags
						</legend>

						{tags.map((tag) => (
							<label
								key={tag.id}
								className="flex items-center gap-2 text-sm"
							>
								<input
									type="checkbox"
									name="tagIds"
									value={tag.id}
									defaultChecked={selectedTagIds.includes(
										tag.id,
									)}
								/>

								{tag.name}
							</label>
						))}
					</fieldset>
				)}
			</fieldset>
		</>
	);
}
