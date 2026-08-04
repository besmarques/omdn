export default function GiftIdeasTemplate({ content }) {
	return (
		<article>
			<h1>{content.title}</h1>
			<p>{content.introduction}</p>
			{content.ideas.map((idea) => (
				<section key={idea.id}>
					<h2>{idea.name}</h2>
					<p>{idea.description}</p>
					<p>Suggested budget: {idea.budget}</p>
				</section>
			))}
		</article>
	);
}
