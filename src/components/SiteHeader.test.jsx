import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';

import { describe, expect, it } from 'vitest';

import SiteHeader from './SiteHeader';
import createQueryClient from '../query/createQueryClient';

function renderHeader() {
	return renderToStaticMarkup(
		<QueryClientProvider client={createQueryClient()}>
			<MemoryRouter>
				<SiteHeader />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('site header', () => {
	it('shows public navigation to guests', () => {
		const html = renderHeader();

		expect(html).toContain('Home');
		expect(html).toContain('href="/recipes"');
		expect(html).toContain('Receitas');
		expect(html).toContain('Login');
		expect(html).toContain('Register');
		expect(html).not.toContain('Logout');
	});

	it('keeps private account controls out of the public website header', () => {
		const html = renderHeader();

		expect(html).toContain('href="/recipes"');
		expect(html).toContain('Login');
		expect(html).toContain('Register');
		expect(html).not.toContain('Account security');
		expect(html).not.toContain('Logout');
	});
});
