import { useState } from 'react';
import { useNavigate } from 'react-router';
import PostEditor from '../content/posts/PostEditor';
import PostEditorFields from '../content/posts/PostEditorFields';
import RecipeFields from '../content/recipes/RecipeFields';
import SeoEditor from '../content/seo/SeoEditor';
import { useAdminContentType, useAdminPost, useUpdateAdminPost } from '../query/adminContentTypeQuery';

function linesFromIngredients(items) {
	return items.map((item) => [item.quantity, item.unit, item.name].filter(Boolean).join(' | ')).join('\n');
}
function parseIngredients(value) {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => {
			const [quantity, unit, ...name] = line.split('|').map((part) => part.trim());
			return { id: `ingredient-${index + 1}`, name: name.join(' | '), ...(quantity ? { quantity } : {}), ...(unit ? { unit } : {}) };
		});
}
function parseInstructions(value) {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((text, index) => ({ id: `step-${index + 1}`, text }));
}
function textFromHtml(value) {
	const element = document.createElement('div');
	element.innerHTML = value;
	return (element.textContent ?? '').replace(/\s+/gu, ' ').trim();
}

function LoadedEditor({ contentType, post, taxonomies }) {
	const navigate = useNavigate();
	const mutation = useUpdateAdminPost(contentType, post.id);
	const source = post.source;
	const [title, setTitle] = useState(source.title);
	const [slug, setSlug] = useState(post.slug);
	const [descriptionHtml, setDescriptionHtml] = useState(source.descriptionHtml || `<p>${source.description}</p>`);
	const [description, setDescription] = useState(source.description);
	const [excerpt, setExcerpt] = useState(post.excerpt || '');
	const [message, setMessage] = useState('');
	const [ingredients, setIngredients] = useState(contentType === 'recipe' ? linesFromIngredients(source.ingredients) : '');
	const [instructions, setInstructions] = useState(contentType === 'recipe' ? source.instructions.map(({ text }) => text).join('\n') : '');

	async function submit(event) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const common = {
			categoryId: form.get('categoryId') ? Number(form.get('categoryId')) : undefined,
			description,
			descriptionHtml,
			excerpt,
			expectedLockVersion: post.lock_version,
			isPillar: form.get('isPillar') === 'on',
			publication: 'draft',
			seo: { description: form.get('seoDescription'), focusKeyword: form.get('focusKeyword'), title: form.get('seoTitle') },
			slug,
			tagIds: form.getAll('tagIds').map(Number),
			title,
		};
		const payload =
			contentType === 'recipe'
				? {
						...common,
						cookMinutes: Number(form.get('cookMinutes')),
						difficulty: form.get('difficulty'),
						ingredients: parseIngredients(ingredients),
						instructions: parseInstructions(instructions),
						prepMinutes: Number(form.get('prepMinutes')),
						yield: { quantity: Number(form.get('yieldQuantity')), unit: form.get('yieldUnit') },
					}
				: common;
		const result = await mutation.mutateAsync(payload);
		setMessage(result.body?.message ?? (result.ok ? 'Post updated' : 'Unable to update post'));
		if (result.ok) navigate(`/admin/${contentType}s`);
	}

	return (
		<PostEditor
			errors={{}}
			message={message}
			onSubmit={submit}
			submitLabel={`Update ${contentType}`}
			submitting={mutation.isPending}
			title={`Edit ${contentType}`}
		>
			<PostEditorFields
				canPublish={false}
				categories={taxonomies.categories}
				tags={taxonomies.tags}
				description={description}
				descriptionHtml={descriptionHtml}
				excerpt={excerpt}
				onDescriptionHtmlChange={(value) => {
					setDescriptionHtml(value);
					setDescription(textFromHtml(value));
				}}
				onExcerptChange={(event) => setExcerpt(event.target.value)}
				onSlugChange={(event) => setSlug(event.target.value)}
				onTitleChange={(event) => setTitle(event.target.value)}
				publication="draft"
				slug={slug}
				title={title}
				selectedCategoryId={post.primary_category_id}
				selectedTagIds={post.tag_ids}
			/>
			{contentType === 'recipe' && (
				<RecipeFields
					ingredients={ingredients}
					instructions={instructions}
					onIngredientsChange={(event) => setIngredients(event.target.value)}
					onInstructionsChange={(event) => setInstructions(event.target.value)}
					values={source}
				/>
			)}
			<SeoEditor
				content={contentType === 'recipe' ? `${ingredients}\n${instructions}` : description}
				description={description}
				excerpt={excerpt}
				focusKeyword={post.focus_keyword}
				isPillar={post.is_pillar_content}
				path={`/${contentType}s/${slug}`}
				seoDescription={post.seo_description}
				seoTitle={post.seo_title}
				title={title}
				type={contentType}
			/>
		</PostEditor>
	);
}

export default function AdminPostEditPage({ contentType, id }) {
	const post = useAdminPost(contentType, id);
	const taxonomies = useAdminContentType(contentType);
	if (post.isPending || taxonomies.isPending)
		return (
			<main className="p-6">
				<p>Loading editor…</p>
			</main>
		);
	if (post.error || taxonomies.error)
		return (
			<main className="p-6">
				<p role="alert">{post.error?.message || taxonomies.error?.message}</p>
			</main>
		);
	return (
		<LoadedEditor
			key={`${contentType}-${id}-${post.data.lock_version}`}
			contentType={contentType}
			post={post.data}
			taxonomies={taxonomies.data}
		/>
	);
}
