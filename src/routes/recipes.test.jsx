import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, RouterContextProvider } from 'react-router';

import { describe, expect, it, vi } from 'vitest';

import { applicationServicesContext } from '#framework/contexts';

import RecipesRoute, { headers, loader, meta } from './recipes';

function createContext(listArchivePage) {
	const context = new RouterContextProvider();

	context.set(applicationServicesContext, {
		publicBaseUrl: 'https://example.com',
		publicRecipes: { listArchivePage },
	});

	return context;
}

function archive(overrides = {}) {
	return {
		items: [],
		page: 1,
		pageSize: 12,
		totalItems: 0,
		totalPages: 1,
		...overrides,
	};
}

describe('public recipe archive route', () => {
	it('loads a numbered page with canonical previous and next metadata', async () => {
		const listArchivePage = vi.fn().mockResolvedValue(archive({ page: 2, totalItems: 30, totalPages: 3 }));
		const loaderData = await loader({
			context: createContext(listArchivePage),
			request: new Request('https://example.com/recipes?page=2'),
		});

		expect(listArchivePage).toHaveBeenCalledWith(2);
		expect(loaderData).toMatchObject({
			canonicalUrl: 'https://example.com/recipes?page=2',
			nextUrl: 'https://example.com/recipes?page=3',
			previousUrl: 'https://example.com/recipes',
		});
		expect(meta({ loaderData })).toEqual(
			expect.arrayContaining([
				{ title: 'Receitas de Natal — Página 2' },
				{ tagName: 'link', rel: 'canonical', href: 'https://example.com/recipes?page=2' },
				{ tagName: 'link', rel: 'prev', href: 'https://example.com/recipes' },
				{ tagName: 'link', rel: 'next', href: 'https://example.com/recipes?page=3' },
			]),
		);
		expect(headers()).toEqual({ 'Cache-Control': 'public, max-age=0, must-revalidate' });
	});

	it('normalizes page one and rejects invalid or missing pages', async () => {
		const context = createContext(vi.fn().mockResolvedValue(archive()));
		const pageOne = loader({ context, request: new Request('https://example.com/recipes?page=1') });
		const malformed = loader({ context, request: new Request('https://example.com/recipes?page=abc') });
		const unsafeInteger = loader({
			context,
			request: new Request('https://example.com/recipes?page=999999999999999999999999999999999999'),
		});
		const missing = loader({
			context: createContext(vi.fn().mockResolvedValue(null)),
			request: new Request('https://example.com/recipes?page=20'),
		});

		await expect(pageOne).rejects.toMatchObject({ status: 301 });
		await expect(malformed).rejects.toMatchObject({ init: { status: 404 } });
		await expect(unsafeInteger).rejects.toMatchObject({ init: { status: 404 } });
		await expect(missing).rejects.toMatchObject({ init: { status: 404 } });
	});

	it('renders recipe links and crawlable numbered navigation', () => {
		const html = renderToStaticMarkup(
			<MemoryRouter>
				<RecipesRoute
					loaderData={archive({
						items: [
							{
								author: { displayName: 'Maria Natal' },
								description: 'A recipe.',
								excerpt: null,
								id: 1,
								slug: 'bolachas',
								title: 'Bolachas',
							},
						],
						page: 2,
						totalItems: 30,
						totalPages: 3,
					})}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('href="/recipes/bolachas"');
		expect(html).toContain('aria-label="Paginação das receitas"');
		expect(html).toContain('href="/recipes"');
		expect(html).toContain('href="/recipes?page=3"');
	});
});
