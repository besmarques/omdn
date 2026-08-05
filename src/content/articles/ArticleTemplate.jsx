import { parseArticleSource } from './articleSchema';

export default function ArticleTemplate({ content }) {
	const article = parseArticleSource(content);
	return (
		<article>
			<h1>{article.title}</h1>
			{article.descriptionHtml ? <div dangerouslySetInnerHTML={{ __html: article.descriptionHtml }} /> : <p>{article.description}</p>}
		</article>
	);
}
