import { useState } from 'react';

import { useCreateArticleMutation } from '../content/articles/queries/articleQueries';
import PostEditor from '../content/posts/PostEditor';
import PostEditorSidebarFields from '../content/posts/PostEditorSidebarFields';
import PostMainFields from '../content/posts/PostMainFields';
import PostMediaFields from '../content/posts/PostMediaFields';
import PostTypeEditorFields from '../content/posts/PostTypeEditorFields';
import { emptyPostMedia } from '../content/posts/postMedia';
import SeoEditor from '../content/seo/SeoEditor';
import useAsyncAction from '../hooks/useAsyncAction';
import useHydrated from '../hooks/useHydrated';
import { useAdminContentType } from '../query/adminContentTypeQuery';

function textFromHtml(value) {
	const element = document.createElement('div');

	element.innerHTML = value;

	return (element.textContent ?? '')
		.replace(/\s+/gu, ' ')
		.trim();
}

export default function AdminArticleCreatePage({
	canPublish,
}) {
	const mutation = useCreateArticleMutation();
	const { data: contentTypeData } =
		useAdminContentType('article');

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
	const [media, setMedia] = useState(emptyPostMedia);

	const ready = useHydrated();

	async function handleSubmit(event) {
		event.preventDefault();

		const formElement = event.currentTarget;
		const form = new FormData(formElement);

		const result = await run(() =>
			mutation.mutateAsync({
				...(form.get('categoryId')
					? {
							categoryId: Number(
								form.get('categoryId'),
							),
						}
					: {}),
				description,
				descriptionHtml,
				excerpt,
				isPillar: form.get('isPillar') === 'on',
				media,
				publication: canPublish
					? publication
					: 'draft',
				...(canPublish &&
				publication === 'schedule'
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
				slug,
				tagIds: form.getAll('tagIds').map(Number),
				title,
			}),
		);

		if (!result) {
			return;
		}

		if (!result.ok) {
			setErrors(result.body?.errors ?? {});
			setMessage(
				result.body?.message ??
					'Unable to create article',
			);
			return;
		}

		if (result.body.data.publication === 'publish') {
			globalThis.location.assign(
				`/articles/${result.body.data.slug}`,
			);
			return;
		}

		setMessage(
			result.body.data.publication === 'schedule'
				? `Article scheduled for ${new Date(
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
		setMedia(emptyPostMedia);
	}

	return (
		<PostEditor
			errors={errors}
			message={message}
			onSubmit={handleSubmit}
			ready={ready}
			submitLabel="Create article"
			submitting={submitting}
			title="Add article"
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
						contentType="article"
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
					setDescription(textFromHtml(value));
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
				contentType="article"
				placement="main"
			/>

			<SeoEditor
				content={description}
				description={description}
				excerpt={excerpt}
				path={`/articles/${
					slug || 'generated-slug'
				}`}
				title={title}
				type="article"
			/>
		</PostEditor>
	);
}
