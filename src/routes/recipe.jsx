import { data, redirect } from 'react-router';

import { createRecipeStructuredData } from '../content/recipes/recipeSchema';
import PageRenderer from '../presentation/PageRenderer';

import { applicationServicesContext } from '#framework/contexts';

function canonicalUrl(publicBaseUrl, slug) {
	return new URL(`/recipes/${slug}`, publicBaseUrl).href;
}

export async function loader({ context, params }) {
	const { publicBaseUrl, publicRecipes } = context.get(applicationServicesContext);
	const result = await publicRecipes.getBySlug(params.slug);

	if (!result) {
		throw data('Recipe not found', { status: 404 });
	}

	if (result.redirect) {
		throw redirect(`/recipes/${result.canonicalSlug}`, 301);
	}

	return {
		canonicalUrl: canonicalUrl(publicBaseUrl, result.canonicalSlug),
		recipe: result.recipe,
	};
}

export function headers() {
	return { 'Cache-Control': 'public, max-age=0, must-revalidate' };
}

export function meta({ loaderData }) {
	if (!loaderData) {
		return [{ title: 'Recipe not found | O Melhor do Natal' }];
	}

	const { canonicalUrl: url, recipe } = loaderData;
	const title = recipe.seo.title || `${recipe.title} | O Melhor do Natal`;
	const description = recipe.seo.description || recipe.description;

	return [
		{ title },
		{ name: 'description', content: description },
		{ tagName: 'link', rel: 'canonical', href: url },
		{ property: 'og:type', content: 'article' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: url },
		{
			'script:ld+json': createRecipeStructuredData(recipe.source, {
				author: recipe.author.displayName,
				datePublished: recipe.publishedAt,
				url,
			}),
		},
	];
}

export default function RecipeRoute({ loaderData }) {
	const { recipe } = loaderData;
	const { presentation, source } = recipe;

	return (
		<PageRenderer
			page={{
				content: source,
				presentation: {
					footer: { type: presentation.footer },
					header: { type: presentation.header },
					layout: presentation.layout,
					sidebar: presentation.regions.sidebar ?? [],
					template: presentation.template,
				},
			}}
		/>
	);
}
