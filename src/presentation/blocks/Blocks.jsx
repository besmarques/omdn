export function NewsletterBlock({ settings }) {
	return (
		<section>
			<h2>{settings.title}</h2>
			<p>{settings.description}</p>
		</section>
	);
}

export function RelatedPostsBlock({ settings }) {
	return (
		<section>
			<h2>{settings.title}</h2>
			<ul>
				{settings.posts.map((post) => (
					<li key={post.slug}>
						<a href={`/posts/${post.slug}`}>{post.title}</a>
					</li>
				))}
			</ul>
		</section>
	);
}
