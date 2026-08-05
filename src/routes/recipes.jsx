import { data, Link, redirect } from 'react-router';

import { applicationServicesContext } from '#framework/contexts';

import { useRecipeArchive } from '../content/recipes/queries/recipeQueries';

const fallbackArchiveDescription = 'Receitas de Natal para preparar, partilhar e celebrar.';

function archivePath(page) {
	return page === 1 ? '/recipes' : `/recipes?page=${page}`;
}

function absoluteArchiveUrl(publicBaseUrl, page) {
	return new URL(archivePath(page), publicBaseUrl).href;
}

function parsePage(request) {
	const values = new URL(request.url).searchParams.getAll('page');

	if (values.length === 0) {
		return 1;
	}

	if (values.length !== 1 || !/^[1-9][0-9]*$/u.test(values[0])) {
		throw data('Recipe archive page not found', { status: 404 });
	}

	const page = Number(values[0]);

	if (!Number.isSafeInteger(page)) {
		throw data('Recipe archive page not found', { status: 404 });
	}

	return page;
}

function paginationItems(currentPage, totalPages) {
	const pages = new Set([1, totalPages]);

	for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
		if (page >= 1 && page <= totalPages) {
			pages.add(page);
		}
	}

	const ordered = [...pages].sort((left, right) => left - right);
	const items = [];

	for (const page of ordered) {
		if (items.length > 0 && page - items.at(-1) > 1) {
			items.push('ellipsis');
		}

		items.push(page);
	}

	return items;
}

export async function loader({ context, request }) {
	const page = parsePage(request);

	if (page === 1 && new URL(request.url).searchParams.has('page')) {
		throw redirect('/recipes', 301);
	}

	const { contentTypeSettings, publicBaseUrl, publicRecipes } = context.get(applicationServicesContext);
	const [archive, archiveSeo] = await Promise.all([
		publicRecipes.listArchivePage(page),
		contentTypeSettings?.getArchiveSeo ? contentTypeSettings.getArchiveSeo('recipe') : null,
	]);

	if (!archive) {
		throw data('Recipe archive page not found', { status: 404 });
	}

	return {
		...archive,
		archiveSeo: archiveSeo ?? { description: fallbackArchiveDescription, title: null },
		canonicalUrl: absoluteArchiveUrl(publicBaseUrl, page),
		nextUrl: page < archive.totalPages ? absoluteArchiveUrl(publicBaseUrl, page + 1) : null,
		previousUrl: page > 1 ? absoluteArchiveUrl(publicBaseUrl, page - 1) : null,
	};
}

export function headers() {
	return { 'Cache-Control': 'public, max-age=0, must-revalidate' };
}

export function meta({ loaderData }) {
	if (!loaderData) {
		return [{ title: 'Recipes not found | O Melhor do Natal' }];
	}

	const title =
		loaderData.page === 1
			? loaderData.archiveSeo.title || 'Receitas de Natal | O Melhor do Natal'
			: `Receitas de Natal — Página ${loaderData.page}`;
	const archiveDescription = loaderData.archiveSeo.description || fallbackArchiveDescription;

	return [
		{ title },
		{ name: 'description', content: archiveDescription },
		{ tagName: 'link', rel: 'canonical', href: loaderData.canonicalUrl },
		...(loaderData.previousUrl ? [{ tagName: 'link', rel: 'prev', href: loaderData.previousUrl }] : []),
		...(loaderData.nextUrl ? [{ tagName: 'link', rel: 'next', href: loaderData.nextUrl }] : []),
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: archiveDescription },
		{ property: 'og:url', content: loaderData.canonicalUrl },
	];
}

export default function RecipesRoute({ loaderData }) {
	const { data: archive } = useRecipeArchive(loaderData.page, loaderData);
	const { items, page, totalPages } = archive;

	return (
		<main className="mx-auto max-w-5xl p-6">
			<header className="mb-8">
				<h1 className="text-4xl font-bold">Receitas de Natal</h1>
				<p>{archive.archiveSeo?.description || fallbackArchiveDescription}</p>
			</header>

			{items.length === 0 ? (
				<p>Ainda não existem receitas publicadas.</p>
			) : (
				<ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{items.map((recipe) => (
						<li key={recipe.id}>
							<article>
								<h2 className="text-2xl font-semibold">
									<Link to={`/recipes/${recipe.slug}`}>{recipe.title}</Link>
								</h2>
								<p>{recipe.excerpt || recipe.description}</p>
								<p>Por {recipe.author.displayName}</p>
							</article>
						</li>
					))}
				</ul>
			)}

			{totalPages > 1 && (
				<nav aria-label="Paginação das receitas" className="mt-10">
					<ul className="flex flex-wrap gap-3">
						{page > 1 && (
							<li>
								<Link rel="prev" to={archivePath(page - 1)}>
									Anterior
								</Link>
							</li>
						)}
						{paginationItems(page, totalPages).map((item, index) =>
							item === 'ellipsis' ? (
								<li aria-hidden="true" key={`ellipsis-${index}`}>
									…
								</li>
							) : (
								<li key={item}>
									<Link aria-current={item === page ? 'page' : undefined} to={archivePath(item)}>
										{item}
									</Link>
								</li>
							),
						)}
						{page < totalPages && (
							<li>
								<Link rel="next" to={archivePath(page + 1)}>
									Seguinte
								</Link>
							</li>
						)}
					</ul>
				</nav>
			)}
		</main>
	);
}
