export const pagePresentationExamples = Object.freeze({
	'gift-ideas': {
		content: {
			ideas: [
				{
					id: 'book',
					name: 'A special book',
					description: 'Choose a subject that matters to the recipient.',
					budget: '€15–€30',
				},
				{
					id: 'experience',
					name: 'A shared experience',
					description: 'Plan an activity you can enjoy together.',
					budget: '€20–€60',
				},
			],
			introduction: 'Two simple starting points for a thoughtful present.',
			title: 'Gift ideas for a close friend',
		},
		presentation: {
			footer: { type: 'standard' },
			header: { type: 'minimal' },
			layout: 'full-width',
			template: 'gift-ideas',
		},
	},
	recipe: {
		content: {
			cookMinutes: 15,
			description: 'Buttery biscuits with a simple Christmas shape.',
			descriptionHtml: '<p>These <strong>buttery biscuits</strong> are simple to prepare and easy to shape with the family.</p>',
			ingredients: [
				{ id: 'flour', name: 'plain flour', quantity: '200', unit: 'g' },
				{ id: 'butter', name: 'butter', note: 'softened', quantity: '100', unit: 'g' },
				{ id: 'sugar', name: 'sugar', quantity: '80', unit: 'g' },
			],
			instructions: [
				{ id: 'mix', text: 'Combine the flour, butter, and sugar into a soft dough.', title: 'Mix' },
				{ id: 'shape', text: 'Roll the dough and cut it into Christmas shapes.', title: 'Shape' },
				{ id: 'bake', text: 'Bake until the edges are lightly golden.', title: 'Bake' },
			],
			kind: 'recipe',
			prepMinutes: 20,
			schemaVersion: 1,
			title: 'Christmas biscuits',
			yield: { quantity: 16, unit: 'biscuits' },
		},
		presentation: {
			footer: { type: 'standard' },
			header: {
				settings: {
					eyebrow: 'Christmas recipes',
					message: 'A different header selected by this page configuration.',
				},
				type: 'hero',
			},
			layout: 'sidebar',
			sidebar: [
				{
					id: 'related-recipes',
					settings: {
						posts: [
							{ slug: 'hot-chocolate', title: 'Hot chocolate' },
							{ slug: 'gingerbread', title: 'Gingerbread' },
						],
						title: 'Related recipes',
					},
					type: 'related-posts',
				},
				{
					id: 'newsletter',
					settings: {
						description: 'A configurable component placed in the sidebar region.',
						title: 'Christmas newsletter',
					},
					type: 'newsletter',
				},
			],
			template: 'recipe',
		},
	},
});
