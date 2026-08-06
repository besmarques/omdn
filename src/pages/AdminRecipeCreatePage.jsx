import { useState } from 'react';

import PostEditor from '../content/posts/PostEditor';
import PostEditorSidebarFields from '../content/posts/PostEditorSidebarFields';
import PostMainFields from '../content/posts/PostMainFields';
import PostMediaFields from '../content/posts/PostMediaFields';
import PostTypeEditorFields from '../content/posts/PostTypeEditorFields';
import { emptyPostMedia } from '../content/posts/postMedia';
import { useCreateRecipeMutation } from '../content/recipes/queries/recipeQueries';
import SeoEditor from '../content/seo/SeoEditor';
import useAsyncAction from '../hooks/useAsyncAction';
import useHydrated from '../hooks/useHydrated';
import { useAdminContentType } from '../query/adminContentTypeQuery';

function parseIngredients(value) {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => {
			const [quantity, unit, ...nameParts] = line
				.split('|')
				.map((part) => part.trim());

			return {
				id: `ingredient-${index + 1}`,
				name: nameParts.join(' | '),
				...(quantity ? { quantity } : {}),
				...(unit ? { unit } : {}),
			};
		});
}

function parseInstructions(value) {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((text, index) => ({
			id: `step-${index + 1}`,
			text,
		}));
}

function plainTextFromHtml(value) {
	const container = document.createElement('div');

	container.innerHTML = value;

	return (container.textContent ?? '')
		.replace(/\s+/gu, ' ')
		.trim();
}

export default function AdminRecipeCreatePage({
	canPublish,
}) {
	const createRecipeMutation = useCreateRecipeMutation();
	const { data: contentTypeData } =
		useAdminContentType('recipe');

	const {
		errors,
		message,
		run,
		setErrors,
		setMessage,
		submitting,
	} = useAsyncAction();

	const [publication, setPublication] =
		useState('draft');
	const [title, setTitle] = useState('');
	const [slug, setSlug] = useState('');
	const [description, setDescription] = useState('');
	const [descriptionHtml, setDescriptionHtml] =
		useState('');
	const [excerpt, setExcerpt] = useState('');
	const [ingredients, setIngredients] = useState('');
	const [instructions, setInstructions] = useState('');
	const [media, setMedia] = useState(emptyPostMedia);
	const [formVersion, setFormVersion] = useState(0);

	const ready = useHydrated();

	const typeFieldProps = {
		ingredients,
		instructions,
		onIngredientsChange: (event) =>
			setIngredients(event.target.value),
		onInstructionsChange: (event) =>
			setInstructions(event.target.value),
	};

	async function handleSubmit(event) {
		event.preventDefault();

		const formElement = event.currentTarget;
		const form = new FormData(formElement);

		const result = await run(() =>
			createRecipeMutation.mutateAsync({
				...(form.get('categoryId')
					? {
							categoryId: Number(
								form.get('categoryId'),
							),
						}
					: {}),
				cookMinutes: Number(
					form.get('cookMinutes'),
				),
				description: form.get('description'),
				descriptionHtml: form.get('descriptionHtml'),
				difficulty: form.get('difficulty'),
				excerpt: form.get('excerpt'),
				ingredients: parseIngredients(
					form.get('ingredients'),
				),
				instructions: parseInstructions(
					form.get('instructions'),
				),
				isPillar: form.get('isPillar') === 'on',
				media,
				prepMinutes: Number(
					form.get('prepMinutes'),
				),
				publication: canPublish
					? form.get('publication')
					: 'draft',
				...(canPublish &&
				form.get('publication') === 'schedule'
					? {
							publishAt: new Date(
								form.get('publishAt'),
							).toISOString(),
						}
					: {}),
				seo: {
					description: form.get('seoDescription'),
					focusKeyword: form.get('focusKeyword'),
					title: form.get('seoTitle'),
				},
				slug: form.get('slug'),
				tagIds: form.getAll('tagIds').map(Number),
				title: form.get('title'),
				yield: {
					quantity: Number(
						form.get('yieldQuantity'),
					),
					unit: form.get('yieldUnit'),
				},
			}),
		);

		if (!result) {
			return;
		}

		if (!result.ok) {
			setErrors(result.body?.errors ?? {});
			setMessage(
				result.body?.message ??
					'Unable to create recipe',
			);
			return;
		}

		if (result.body.data.publication === 'publish') {
			globalThis.location.assign(
				`/recipes/${result.body.data.slug}`,
			);
			return;
		}

		setMessage(
			result.body.data.publication === 'schedule'
				? `Recipe scheduled for ${new Date(
						result.body.data.publishAt,
					).toLocaleString()}`
				: `Draft created with ID ${result.body.data.id}`,
		);

		formElement.reset();
		setPublication('draft');
		setTitle('');
		setSlug('');
		setDescription('');
		setDescriptionHtml('');
		setExcerpt('');
		setIngredients('');
		setInstructions('');
		setMedia(emptyPostMedia);
		setFormVersion((version) => version + 1);
	}

	return (
		<PostEditor
			errors={errors}
			message={message}
			onSubmit={handleSubmit}
			ready={ready}
			submitLabel="Create recipe"
			submitting={submitting}
			title="Add recipe"
			sidebar={
				<>
					<PostEditorSidebarFields
						canPublish={canPublish}
						categories={
							contentTypeData?.categories ?? []
						}
						onPublicationChange={(event) =>
							setPublication(event.target.value)
						}
						publication={publication}
						tags={contentTypeData?.tags ?? []}
					/>

					<PostTypeEditorFields
						componentProps={typeFieldProps}
						contentType="recipe"
						placement="sidebar"
					/>

					<PostMediaFields
						onChange={setMedia}
						value={media}
					/>
				</>
			}
		>
			<PostMainFields
				description={description}
				descriptionHtml={descriptionHtml}
				excerpt={excerpt}
				onDescriptionHtmlChange={(value) => {
					setDescriptionHtml(value);
					setDescription(
						plainTextFromHtml(value),
					);
				}}
				onExcerptChange={(event) =>
					setExcerpt(event.target.value)
				}
				onSlugChange={(event) =>
					setSlug(event.target.value)
				}
				onTitleChange={(event) =>
					setTitle(event.target.value)
				}
				slug={slug}
				title={title}
			/>

			<PostTypeEditorFields
				componentProps={typeFieldProps}
				contentType="recipe"
				placement="main"
			/>

			<SeoEditor
				key={formVersion}
				content={`${ingredients}\n${instructions}`}
				description={description}
				excerpt={excerpt}
				path={`/recipes/${
					slug || 'generated-slug'
				}`}
				title={title}
				type="recipe"
			/>
		</PostEditor>
	);
}
