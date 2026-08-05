import { useState } from 'react';
import PostEditor from '../content/posts/PostEditor';
import PostEditorFields from '../content/posts/PostEditorFields';
import SeoEditor from '../content/seo/SeoEditor';
import { useCreateArticleMutation } from '../content/articles/queries/articleQueries';
import useAsyncAction from '../hooks/useAsyncAction';
import useHydrated from '../hooks/useHydrated';
import { useAdminContentType } from '../query/adminContentTypeQuery';

function textFromHtml(value) {
	const element = document.createElement('div');
	element.innerHTML = value;
	return (element.textContent ?? '').replace(/\s+/gu, ' ').trim();
}

export default function AdminArticleCreatePage({ canPublish }) {
	const mutation = useCreateArticleMutation();
	const { data: contentTypeData } = useAdminContentType('article');
	const { errors, message, run, setErrors, setMessage, submitting } = useAsyncAction();
	const [publication, setPublication] = useState('draft');
	const [title, setTitle] = useState('');
	const [slug, setSlug] = useState('');
	const [description, setDescription] = useState('');
	const [descriptionHtml, setDescriptionHtml] = useState('');
	const [excerpt, setExcerpt] = useState('');
	const ready = useHydrated();
	async function handleSubmit(event) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const result = await run(() =>
			mutation.mutateAsync({
				...(form.get('categoryId') ? { categoryId: Number(form.get('categoryId')) } : {}),
				tagIds: form.getAll('tagIds').map(Number),
				description,
				descriptionHtml,
				excerpt,
				isPillar: form.get('isPillar') === 'on',
				publication: canPublish ? publication : 'draft',
				...(canPublish && publication === 'schedule' ? { publishAt: new Date(form.get('publishAt')).toISOString() } : {}),
				seo: { description: form.get('seoDescription'), focusKeyword: form.get('focusKeyword'), title: form.get('seoTitle') },
				slug,
				title,
			}),
		);
		if (!result) return;
		if (!result.ok) {
			setErrors(result.body?.errors ?? {});
			setMessage(result.body?.message ?? 'Unable to create article');
			return;
		}
		if (result.body.data.publication === 'publish') {
			globalThis.location.assign(`/articles/${result.body.data.slug}`);
			return;
		}
		setMessage(
			result.body.data.publication === 'schedule'
				? `Article scheduled for ${new Date(result.body.data.publishAt).toLocaleString()}`
				: `Draft created with ID ${result.body.data.id}`,
		);
		formElement.reset();
		setPublication('draft');
		setTitle('');
		setSlug('');
		setDescription('');
		setDescriptionHtml('');
		setExcerpt('');
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
		>
			<PostEditorFields
				canPublish={canPublish}
				categories={contentTypeData?.categories ?? []}
				tags={contentTypeData?.tags ?? []}
				description={description}
				descriptionHtml={descriptionHtml}
				excerpt={excerpt}
				onDescriptionHtmlChange={(value) => {
					setDescriptionHtml(value);
					setDescription(textFromHtml(value));
				}}
				onExcerptChange={(e) => setExcerpt(e.target.value)}
				onPublicationChange={(e) => setPublication(e.target.value)}
				onSlugChange={(e) => setSlug(e.target.value)}
				onTitleChange={(e) => setTitle(e.target.value)}
				publication={publication}
				slug={slug}
				title={title}
			/>
			<SeoEditor
				content={description}
				description={description}
				excerpt={excerpt}
				path={`/articles/${slug || 'generated-slug'}`}
				title={title}
				type="article"
			/>
		</PostEditor>
	);
}
