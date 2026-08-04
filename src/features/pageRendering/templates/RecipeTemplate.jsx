export default function RecipeTemplate({ content }) {
	return (
		<article>
			<h1>{content.title}</h1>
			<p>Preparation time: {content.preparationTime}</p>
			<section>
				<h2>Ingredients</h2>
				<ul>
					{content.ingredients.map((ingredient) => (
						<li key={ingredient}>{ingredient}</li>
					))}
				</ul>
			</section>
			<section>
				<h2>Instructions</h2>
				<ol>
					{content.instructions.map((instruction) => (
						<li key={instruction}>{instruction}</li>
					))}
				</ol>
			</section>
		</article>
	);
}
