import { parseArticleSource } from './articleSchema';
import PostMediaDisplay from '../posts/PostMediaDisplay';

export default function ArticleTemplate({ content, media }) {
	const article = parseArticleSource(content);
	return (
		<article>
			<h1>{article.title}</h1>
			<PostMediaDisplay media={media} />
			{article.descriptionHtml ? <div dangerouslySetInnerHTML={{ __html: article.descriptionHtml }} /> : <p>{article.description}</p>}
		</article>
	);
}
