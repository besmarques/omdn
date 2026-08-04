import { useState } from 'react';
import { useFetcher } from 'react-router';

import RecipeDescriptionEditor from '@/content/recipes/RecipeDescriptionEditor';
import { parseRecipeArticleSource, serializeRecipeArticleSource } from '@/content/recipes/recipeSchema';
import PageRenderer from '@/presentation/PageRenderer';

export default function RecipeEditorProofPage({ page }) {
	const fetcher = useFetcher();
	const initialRecipe = parseRecipeArticleSource(page.content);
	const [descriptionHtml, setDescriptionHtml] = useState(initialRecipe.descriptionHtml ?? `<p>${initialRecipe.description}</p>`);
	const savedRecipe = fetcher.data?.recipe ?? initialRecipe;
	const message = fetcher.data?.recipe ? 'Recipe revision validated, sanitized on the server, restored, and rendered below.' : '';

	function saveRevision() {
		fetcher.submit(
			{
				source: serializeRecipeArticleSource({
					...initialRecipe,
					descriptionHtml,
				}),
			},
			{ method: 'post' },
		);
	}

	return (
		<main>
			<h1>Recipe description editor proof</h1>
			<p>TinyMCE is loaded from the local application bundle. Only the recipe description uses rich text.</p>

			<label>Recipe description</label>
			<RecipeDescriptionEditor initialValue={descriptionHtml} onChange={setDescriptionHtml} />
			<button type="button" disabled={fetcher.state !== 'idle'} onClick={saveRevision}>
				{fetcher.state === 'idle' ? 'Save proof revision' : 'Saving...'}
			</button>
			{message && <p>{message}</p>}

			<h2>Saved recipe preview</h2>
			<PageRenderer page={{ ...page, content: savedRecipe }} />
		</main>
	);
}
