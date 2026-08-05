import { useState, useSyncExternalStore } from 'react';

import { createRecipe } from '../api/adminRecipeApi';
import PostEditorFields from '../content/posts/PostEditorFields';
import SeoEditor from '../content/seo/SeoEditor';

function parseIngredients(value) {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line, index) => {
			const [quantity, unit, ...nameParts] = line.split('|').map((part) => part.trim());

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
		.map((text, index) => ({ id: `step-${index + 1}`, text }));
}

export default function AdminRecipeCreatePage({ canPublish }) {
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);
	const [publication, setPublication] = useState('draft');
	const [title, setTitle] = useState('');
	const [slug, setSlug] = useState('');
	const [description, setDescription] = useState('');
	const [excerpt, setExcerpt] = useState('');
	const [ingredients, setIngredients] = useState('');
	const [instructions, setInstructions] = useState('');
	const [formVersion, setFormVersion] = useState(0);
	const ready = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);

	async function handleSubmit(event) {
		event.preventDefault();
		const formElement = event.currentTarget;
		setErrors({});
		setMessage('');
		setSubmitting(true);

		const form = new FormData(formElement);
		let result;

		try {
			result = await createRecipe({
				cookMinutes: Number(form.get('cookMinutes')),
				description: form.get('description'),
				difficulty: form.get('difficulty'),
				excerpt: form.get('excerpt'),
				ingredients: parseIngredients(form.get('ingredients')),
				instructions: parseInstructions(form.get('instructions')),
				isPillar: form.get('isPillar') === 'on',
				prepMinutes: Number(form.get('prepMinutes')),
				publication: canPublish ? form.get('publication') : 'draft',
				...(canPublish && form.get('publication') === 'schedule' ? { publishAt: new Date(form.get('publishAt')).toISOString() } : {}),
				seo: {
					description: form.get('seoDescription'),
					focusKeyword: form.get('focusKeyword'),
					title: form.get('seoTitle'),
				},
				slug: form.get('slug'),
				title: form.get('title'),
				yield: { quantity: Number(form.get('yieldQuantity')), unit: form.get('yieldUnit') },
			});
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
			return;
		} finally {
			setSubmitting(false);
		}

		if (!result.ok) {
			setErrors(result.body?.errors ?? {});
			setMessage(result.body?.message ?? 'Unable to create recipe');
			return;
		}

		if (result.body.data.publication === 'publish') {
			globalThis.location.assign(`/recipes/${result.body.data.slug}`);
			return;
		}

		setMessage(
			result.body.data.publication === 'schedule'
				? `Recipe scheduled for ${new Date(result.body.data.publishAt).toLocaleString()}`
				: `Draft created with ID ${result.body.data.id}`,
		);
		formElement.reset();
		setPublication('draft');
		setTitle('');
		setSlug('');
		setDescription('');
		setExcerpt('');
		setIngredients('');
		setInstructions('');
		setFormVersion((version) => version + 1);
	}

	return (
		<main className="mx-auto max-w-3xl p-6">
			<h1 className="text-4xl font-bold">Add recipe</h1>
			<form className="grid gap-4" inert={!ready} onSubmit={handleSubmit}>
				<PostEditorFields
					canPublish={canPublish}
					description={description}
					excerpt={excerpt}
					onDescriptionChange={(event) => setDescription(event.target.value)}
					onExcerptChange={(event) => setExcerpt(event.target.value)}
					onPublicationChange={(event) => setPublication(event.target.value)}
					onSlugChange={(event) => setSlug(event.target.value)}
					onTitleChange={(event) => setTitle(event.target.value)}
					publication={publication}
					slug={slug}
					title={title}
				/>
				<label htmlFor="ingredients">Ingredients</label>
				<textarea
					id="ingredients"
					name="ingredients"
					required
					placeholder={'250 | g | farinha\n100 | g | manteiga'}
					value={ingredients}
					onChange={(event) => setIngredients(event.target.value)}
				/>
				<p>One ingredient per line: quantity | unit | name</p>
				<label htmlFor="instructions">Instructions</label>
				<textarea
					id="instructions"
					name="instructions"
					required
					placeholder={'Misture os ingredientes.\nLeve ao forno.'}
					value={instructions}
					onChange={(event) => setInstructions(event.target.value)}
				/>
				<p>One instruction per line.</p>
				<label htmlFor="prepMinutes">Preparation minutes</label>
				<input id="prepMinutes" name="prepMinutes" type="number" min="0" required />
				<label htmlFor="cookMinutes">Cooking minutes</label>
				<input id="cookMinutes" name="cookMinutes" type="number" min="0" required />
				<label htmlFor="difficulty">Difficulty</label>
				<select id="difficulty" name="difficulty" defaultValue="easy">
					<option value="easy">Easy</option>
					<option value="medium">Medium</option>
					<option value="hard">Hard</option>
				</select>
				<label htmlFor="yieldQuantity">Yield quantity</label>
				<input id="yieldQuantity" name="yieldQuantity" type="number" min="0.01" step="any" required />
				<label htmlFor="yieldUnit">Yield unit</label>
				<input id="yieldUnit" name="yieldUnit" required maxLength={200} />
				<SeoEditor
					key={formVersion}
					content={`${ingredients}\n${instructions}`}
					description={description}
					excerpt={excerpt}
					path={`/recipes/${slug || 'generated-slug'}`}
					title={title}
					type="recipe"
				/>
				<button type="submit" disabled={!ready || submitting}>
					{submitting ? 'Creating…' : 'Create recipe'}
				</button>
			</form>
			{message && <p role="status">{message}</p>}
			{Object.values(errors)
				.flat()
				.map((error) => (
					<p key={error}>{error}</p>
				))}
		</main>
	);
}
