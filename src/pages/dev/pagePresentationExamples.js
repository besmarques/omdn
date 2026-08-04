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
			ingredients: ['200 g flour', '100 g butter', '80 g sugar'],
			instructions: ['Mix the ingredients.', 'Shape the biscuits.', 'Bake until golden.'],
			preparationTime: '35 minutes',
			title: 'Christmas biscuits',
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
