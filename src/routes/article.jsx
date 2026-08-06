import { data, redirect } from 'react-router';
import { applicationServicesContext } from '#framework/contexts';
import { useArticle } from '../content/articles/queries/articleQueries';
import { createPostStructuredData } from '../content/structuredData/structuredDataRegistry';
import PageRenderer from '../presentation/PageRenderer';

export async function loader({ context, params }) {
	const { publicArticles, publicBaseUrl } = context.get(applicationServicesContext);
	const result = await publicArticles.getBySlug(params.slug);
	if (!result) throw data('Article not found', { status: 404 });
	if (result.redirect) throw redirect(`/articles/${result.canonicalSlug}`, 301);
	return { article: result.article, canonicalUrl: new URL(`/articles/${result.canonicalSlug}`, publicBaseUrl).href };
}
export function headers() {
	return { 'Cache-Control': 'public, max-age=0, must-revalidate' };
}
export function meta({ loaderData }) {
	if (!loaderData) return [{ title: 'Article not found | O Melhor do Natal' }];
	const { article, canonicalUrl } = loaderData;
	const title = article.seo.title || `${article.title} | O Melhor do Natal`;
	const description = article.seo.description || article.description;
	const images = [article.media.featured, ...article.media.gallery]
		.filter(Boolean)
		.map((image) => new URL(image.variants.at(-1).url, canonicalUrl).href);
	return [
		{ title },
		{ name: 'description', content: description },
		{ tagName: 'link', rel: 'canonical', href: canonicalUrl },
		{ property: 'og:type', content: 'article' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: canonicalUrl },
		...(images[0] ? [{ property: 'og:image', content: images[0] }] : []),
		{
			'script:ld+json': createPostStructuredData(article.contentType, article.source, {
				author: article.author.displayName,
				datePublished: article.publishedAt,
				url: canonicalUrl,
				images,
			}),
		},
	];
}
export default function ArticleRoute({ loaderData }) {
	const { data: article } = useArticle(loaderData.article.slug, loaderData.article);
	return (
		<PageRenderer
			page={{
				content: article.source,
				media: article.media,
				presentation: {
					footer: { type: article.presentation.footer },
					header: { type: article.presentation.header },
					layout: article.presentation.layout,
					sidebar: article.presentation.regions.sidebar ?? [],
					template: article.presentation.template,
				},
				structuredData: false,
			}}
		/>
	);
}
