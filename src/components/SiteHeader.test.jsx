import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import { describe, expect, it } from 'vitest';

import SiteHeader from './SiteHeader';

function renderHeader(principal) {
	return renderToStaticMarkup(
		<MemoryRouter>
			<SiteHeader principal={principal} />
		</MemoryRouter>,
	);
}

describe('site header', () => {
	it('shows public navigation to guests', () => {
		const html = renderHeader();

		expect(html).toContain('Home');
		expect(html).toContain('Login');
		expect(html).toContain('Register');
		expect(html).not.toContain('Logout');
	});

	it('shows account navigation and logout to authenticated users', () => {
		const html = renderHeader({
			authenticated: true,
			permissions: ['users.manage'],
			user: { email: 'admin@example.com' },
		});

		expect(html).toContain('Account security');
		expect(html).toContain('Admin');
		expect(html).toContain('Logout');
		expect(html).toContain('admin@example.com');
		expect(html).not.toContain('Register');
	});
});
