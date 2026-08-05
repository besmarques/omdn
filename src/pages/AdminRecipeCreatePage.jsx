import { useState } from 'react';
import { useNavigate } from 'react-router';

import { createRecipe } from '../api/adminRecipeApi';

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
	const navigate = useNavigate();
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		const formElement = event.currentTarget;
		setErrors({});
		setMessage('');
		setSubmitting(true);

		const form = new FormData(formElement);
		const publish = canPublish && form.get('publish') === 'on';
		let result;

		try {
			result = await createRecipe({
				cookMinutes: Number(form.get('cookMinutes')),
				description: form.get('description'),
				difficulty: form.get('difficulty'),
				ingredients: parseIngredients(form.get('ingredients')),
				instructions: parseInstructions(form.get('instructions')),
				prepMinutes: Number(form.get('prepMinutes')),
				publish,
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

		if (result.body.data.published) {
			navigate(`/recipes/${result.body.data.slug}`);
			return;
		}

		setMessage(`Draft created with ID ${result.body.data.id}`);
		formElement.reset();
	}

	return (
		<main className="mx-auto max-w-3xl p-6">
			<h1 className="text-4xl font-bold">Add recipe</h1>
			<form className="grid gap-4" onSubmit={handleSubmit}>
				<label htmlFor="title">Title</label>
				<input id="title" name="title" required maxLength={200} />
				<label htmlFor="slug">Slug</label>
				<input
					id="slug"
					name="slug"
					maxLength={200}
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
					placeholder="Generated from the title when left blank"
				/>
				<label htmlFor="description">Description</label>
				<textarea id="description" name="description" required maxLength={5000} />
				<label htmlFor="ingredients">Ingredients</label>
				<textarea id="ingredients" name="ingredients" required placeholder={'250 | g | farinha\n100 | g | manteiga'} />
				<p>One ingredient per line: quantity | unit | name</p>
				<label htmlFor="instructions">Instructions</label>
				<textarea id="instructions" name="instructions" required placeholder={'Misture os ingredientes.\nLeve ao forno.'} />
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
				{canPublish && (
					<label>
						<input name="publish" type="checkbox" /> Publish immediately
					</label>
				)}
				<button type="submit" disabled={submitting}>
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
