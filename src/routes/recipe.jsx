import { data, redirect } from 'react-router';

import { createPostStructuredData } from '../content/structuredData/structuredDataRegistry';
import { useRecipe } from '../content/recipes/queries/recipeQueries';
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
	const images = [recipe.media.featured, ...recipe.media.gallery]
		.filter(Boolean)
		.map((image) => new URL(image.variants.at(-1).url, url).href);

	return [
		{ title },
		{ name: 'description', content: description },
		{ tagName: 'link', rel: 'canonical', href: url },
		{ property: 'og:type', content: 'article' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: url },
		...(images[0] ? [{ property: 'og:image', content: images[0] }] : []),
		{
			'script:ld+json': createPostStructuredData(recipe.contentType, recipe.source, {
				author: recipe.author.displayName,
				datePublished: recipe.publishedAt,
				url,
				images,
			}),
		},
	];
}

export default function RecipeRoute({ loaderData }) {
	const { data: recipe } = useRecipe(loaderData.recipe.slug, loaderData.recipe);
	const { presentation, source } = recipe;

	return (
		<PageRenderer
			page={{
				content: source,
				media: recipe.media,
				presentation: {
					footer: { type: presentation.footer },
					header: { type: presentation.header },
					layout: presentation.layout,
					sidebar: presentation.regions.sidebar ?? [],
					template: presentation.template,
				},
				structuredData: false,
			}}
		/>
	);
}
