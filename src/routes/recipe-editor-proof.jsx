import { data } from 'react-router';

import { sanitizeRecipeDescriptionHtml } from '@/features/articleSource/recipeDescriptionSanitizer.server';
import { parseRecipeArticleSource, restoreRecipeArticleSource, serializeRecipeArticleSource } from '@/features/articleSource/recipeSource';
import RecipeEditorProofPage from '@/pages/dev/RecipeEditorProofPage';
import { pagePresentationExamples } from '@/pages/dev/pagePresentationExamples';

export function loader() {
	return { page: pagePresentationExamples.recipe };
}

export async function action({ request }) {
	try {
		const formData = await request.formData();
		const serializedSource = formData.get('source');

		if (typeof serializedSource !== 'string' || serializedSource.length > 50000) {
			throw new Error('Invalid recipe revision');
		}

		const recipe = parseRecipeArticleSource(JSON.parse(serializedSource));
		const sanitizedRecipe = {
			...recipe,
			descriptionHtml: recipe.descriptionHtml ? sanitizeRecipeDescriptionHtml(recipe.descriptionHtml) : undefined,
		};

		return {
			recipe: restoreRecipeArticleSource(serializeRecipeArticleSource(sanitizedRecipe)),
		};
	} catch {
		throw data({ message: 'Invalid recipe revision' }, { status: 400 });
	}
}

export function meta() {
	return [{ title: 'Recipe editor proof | OMDN' }];
}

export default function RecipeEditorProofRoute({ loaderData }) {
	return <RecipeEditorProofPage page={loaderData.page} />;
}
