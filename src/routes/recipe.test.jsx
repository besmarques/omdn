import { RouterContextProvider } from 'react-router';

import { describe, expect, it, vi } from 'vitest';

import { applicationServicesContext } from '#framework/contexts';

import { headers, loader, meta } from './recipe';

function createContext(publicRecipes) {
	const context = new RouterContextProvider();

	context.set(applicationServicesContext, {
		publicBaseUrl: 'https://example.com/base',
		publicRecipes,
	});

	return context;
}

const recipe = {
	author: { displayName: 'Recipe Author' },
	description: 'Christmas biscuits.',
	publishedAt: '2026-08-05T00:00:00.000Z',
	seo: { description: null, title: null },
	source: {
		cookMinutes: 12,
		description: 'Christmas biscuits.',
		difficulty: 'easy',
		ingredients: [{ id: 'flour', name: 'flour' }],
		instructions: [{ id: 'mix', text: 'Mix.' }],
		kind: 'recipe',
		prepMinutes: 10,
		schemaVersion: 1,
		title: 'Biscuits',
		yield: { quantity: 12, unit: 'biscuits' },
	},
	title: 'Biscuits',
};

describe('public recipe route', () => {
	it('loads canonical recipe data and creates SEO metadata', async () => {
		const loaderData = await loader({
			context: createContext({
				getBySlug: vi.fn().mockResolvedValue({ canonicalSlug: 'biscuits', redirect: false, recipe }),
			}),
			params: { slug: 'biscuits' },
		});

		expect(loaderData.canonicalUrl).toBe('https://example.com/recipes/biscuits');
		expect(meta({ loaderData })).toEqual(
			expect.arrayContaining([
				{ title: 'Biscuits | O Melhor do Natal' },
				{ tagName: 'link', rel: 'canonical', href: 'https://example.com/recipes/biscuits' },
				{ property: 'og:url', content: 'https://example.com/recipes/biscuits' },
			]),
		);
		expect(headers()).toEqual({ 'Cache-Control': 'public, max-age=0, must-revalidate' });
	});

	it('returns real redirect and not-found responses', async () => {
		const redirectCall = loader({
			context: createContext({
				getBySlug: vi.fn().mockResolvedValue({ canonicalSlug: 'biscuits', redirect: true, recipe }),
			}),
			params: { slug: 'old-biscuits' },
		});
		const missingCall = loader({
			context: createContext({ getBySlug: vi.fn().mockResolvedValue(null) }),
			params: { slug: 'missing' },
		});

		await expect(redirectCall).rejects.toMatchObject({ status: 301 });
		await expect(redirectCall).rejects.toSatisfy((response) => response.headers.get('location') === '/recipes/biscuits');
		await expect(missingCall).rejects.toMatchObject({ init: { status: 404 } });
	});
});
