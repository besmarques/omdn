import { data, Link, redirect } from 'react-router';
import { applicationServicesContext } from '#framework/contexts';
import { useArticleArchive } from '../content/articles/queries/articleQueries';

const description = 'Artigos para inspirar e preparar um Natal especial.';
function path(page) {
	return page === 1 ? '/articles' : `/articles?page=${page}`;
}
function parsePage(request) {
	const values = new URL(request.url).searchParams.getAll('page');
	if (!values.length) return 1;
	if (values.length !== 1 || !/^[1-9][0-9]*$/u.test(values[0]) || !Number.isSafeInteger(Number(values[0])))
		throw data('Article archive page not found', { status: 404 });
	return Number(values[0]);
}
export async function loader({ context, request }) {
	const page = parsePage(request);
	if (page === 1 && new URL(request.url).searchParams.has('page')) throw redirect('/articles', 301);
	const { publicArticles, publicBaseUrl } = context.get(applicationServicesContext);
	const archive = await publicArticles.listArchivePage(page);
	if (!archive) throw data('Article archive page not found', { status: 404 });
	return {
		...archive,
		canonicalUrl: new URL(path(page), publicBaseUrl).href,
		nextUrl: page < archive.totalPages ? new URL(path(page + 1), publicBaseUrl).href : null,
		previousUrl: page > 1 ? new URL(path(page - 1), publicBaseUrl).href : null,
	};
}
export function headers() {
	return { 'Cache-Control': 'public, max-age=0, must-revalidate' };
}
export function meta({ loaderData }) {
	if (!loaderData) return [{ title: 'Articles not found | O Melhor do Natal' }];
	const title = loaderData.page === 1 ? 'Artigos de Natal | O Melhor do Natal' : `Artigos de Natal — Página ${loaderData.page}`;
	return [
		{ title },
		{ name: 'description', content: description },
		{ tagName: 'link', rel: 'canonical', href: loaderData.canonicalUrl },
		...(loaderData.previousUrl ? [{ tagName: 'link', rel: 'prev', href: loaderData.previousUrl }] : []),
		...(loaderData.nextUrl ? [{ tagName: 'link', rel: 'next', href: loaderData.nextUrl }] : []),
		{ property: 'og:type', content: 'website' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: loaderData.canonicalUrl },
	];
}
export default function ArticlesRoute({ loaderData }) {
	const { data: archive } = useArticleArchive(loaderData.page, loaderData);
	return (
		<main className="mx-auto max-w-5xl p-6">
			<header className="mb-8">
				<h1 className="text-4xl font-bold">Artigos de Natal</h1>
				<p>{description}</p>
			</header>
			{archive.items.length ? (
				<ul className="grid gap-6 md:grid-cols-2">
					{archive.items.map((article) => (
						<li key={article.id}>
							<article>
								<h2 className="text-2xl font-semibold">
									<Link to={`/articles/${article.slug}`}>{article.title}</Link>
								</h2>
								<p>{article.excerpt || article.description}</p>
								<p>Por {article.author.displayName}</p>
							</article>
						</li>
					))}
				</ul>
			) : (
				<p>Ainda não existem artigos publicados.</p>
			)}
			{archive.totalPages > 1 && (
				<nav aria-label="Paginação dos artigos" className="mt-10">
					{archive.page > 1 && (
						<Link rel="prev" to={path(archive.page - 1)}>
							Anterior
						</Link>
					)}{' '}
					{archive.page < archive.totalPages && (
						<Link rel="next" to={path(archive.page + 1)}>
							Seguinte
						</Link>
					)}
				</nav>
			)}
		</main>
	);
}
