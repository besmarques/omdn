import { describe, expect, it, vi } from 'vitest';

import createPublicRecipeService from './publicRecipeService';

const source = {
	cookMinutes: 15,
	description: 'A published Christmas recipe.',
	difficulty: 'easy',
	ingredients: [{ id: 'flour', name: 'flour', quantity: '200', unit: 'g' }],
	instructions: [{ id: 'mix', text: 'Mix the ingredients.' }],
	kind: 'recipe',
	prepMinutes: 10,
	schemaVersion: 1,
	title: 'Published recipe',
	yield: { quantity: 8, unit: 'servings' },
};

function createRow(overrides = {}) {
	return {
		id: 42,
		published_at: new Date('2026-08-05T00:00:00.000Z'),
		author_id: 7,
		author_display_name: 'Recipe Author',
		primary_category_id: 3,
		primary_category_name: 'Recipes',
		canonical_slug: 'published-recipe',
		title: source.title,
		excerpt: 'Short introduction',
		seo_title: 'Published recipe SEO',
		seo_description: 'Published recipe description',
		layout_key: 'sidebar',
		template_key: 'recipe',
		header_key: 'hero',
		footer_key: 'standard',
		region_config: JSON.stringify({ sidebar: [] }),
		source: JSON.stringify(source),
		source_schema_version: 1,
		render_version: 1,
		requested_slug_kind: 'canonical',
		...overrides,
	};
}

describe('public recipe service', () => {
	it('returns the validated published source and redirect information', async () => {
		const repository = {
			findBySlug: vi.fn().mockResolvedValue(createRow({ requested_slug_kind: 'redirect' })),
			list: vi.fn(),
		};
		const service = createPublicRecipeService(repository);

		await expect(service.getBySlug('old-published-recipe')).resolves.toMatchObject({
			canonicalSlug: 'published-recipe',
			redirect: true,
			recipe: {
				source,
				title: 'Published recipe',
			},
		});
		expect(repository.findBySlug).toHaveBeenCalledWith('old-published-recipe');
	});

	it('rejects invalid slugs and invalid stored recipe sources', async () => {
		const repository = {
			findBySlug: vi.fn().mockResolvedValue(createRow({ source: '{}' })),
			list: vi.fn(),
		};
		const service = createPublicRecipeService(repository);

		await expect(service.getBySlug('../private')).rejects.toThrow('Invalid recipe slug');
		await expect(service.getBySlug('published-recipe')).rejects.toThrow();
	});

	it('uses one extra row to create a stable keyset cursor', async () => {
		const repository = {
			findBySlug: vi.fn(),
			list: vi
				.fn()
				.mockResolvedValue([
					createRow(),
					createRow({ id: 41, canonical_slug: 'second-recipe', published_at: new Date('2026-08-04T00:00:00.000Z') }),
				]),
		};
		const service = createPublicRecipeService(repository);

		await expect(service.list({ limit: 1 })).resolves.toMatchObject({
			items: [{ id: 42, slug: 'published-recipe' }],
			nextCursor: {
				id: 42,
				publishedAt: '2026-08-05T00:00:00.000Z',
			},
		});
		expect(repository.list).toHaveBeenCalledWith({ cursor: null, limit: 2 });
	});

	it('normalizes and validates an incoming cursor', async () => {
		const repository = {
			findBySlug: vi.fn(),
			list: vi.fn().mockResolvedValue([]),
		};
		const service = createPublicRecipeService(repository);

		await service.list({ cursor: { id: 42, publishedAt: '2026-08-05T00:00:00.000Z' }, limit: 10 });

		expect(repository.list).toHaveBeenCalledWith({
			cursor: {
				id: 42,
				publishedAt: new Date('2026-08-05T00:00:00.000Z'),
			},
			limit: 11,
		});
		await expect(service.list({ limit: 51 })).rejects.toThrow('Recipe page size');
		await expect(service.list({ cursor: { id: 0, publishedAt: 'invalid' } })).rejects.toThrow('Invalid recipe cursor');
	});
});
