import { formatIngredient, parseRecipeArticleSource, serializeRecipeStructuredData } from './recipeSchema';

export default function RecipeTemplate({ content, includeStructuredData = true }) {
	const recipe = parseRecipeArticleSource(content);

	return (
		<article>
			{includeStructuredData && (
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeRecipeStructuredData(recipe) }} />
			)}
			<h1>{recipe.title}</h1>
			{recipe.descriptionHtml ? <div dangerouslySetInnerHTML={{ __html: recipe.descriptionHtml }} /> : <p>{recipe.description}</p>}
			<dl>
				<div>
					<dt>Preparation time</dt>
					<dd>{recipe.prepMinutes} minutes</dd>
				</div>
				<div>
					<dt>Cooking time</dt>
					<dd>{recipe.cookMinutes} minutes</dd>
				</div>
				{recipe.difficulty && (
					<div>
						<dt>Difficulty</dt>
						<dd>{recipe.difficulty}</dd>
					</div>
				)}
				<div>
					<dt>Yield</dt>
					<dd>
						{recipe.yield.quantity} {recipe.yield.unit}
					</dd>
				</div>
			</dl>
			<section>
				<h2>Ingredients</h2>
				<ul>
					{recipe.ingredients.map((ingredient) => (
						<li key={ingredient.id}>{formatIngredient(ingredient)}</li>
					))}
				</ul>
			</section>
			<section>
				<h2>Instructions</h2>
				<ol>
					{recipe.instructions.map((instruction) => (
						<li key={instruction.id}>
							{instruction.title && <strong>{instruction.title}: </strong>}
							{instruction.text}
						</li>
					))}
				</ol>
			</section>
		</article>
	);
}
