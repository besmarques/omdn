import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import createQueryClient from '../../query/createQueryClient';
import AdminLayout from './AdminLayout';

function renderNavigation(permissions) {
	return renderToStaticMarkup(
		<QueryClientProvider client={createQueryClient()}>
			<MemoryRouter>
				<AdminLayout account={{ authenticated: true, permissions, user: { displayName: 'Maria', email: 'maria@example.com' } }} />
			</MemoryRouter>
		</QueryClientProvider>,
	);
}

describe('admin layout navigation', () => {
	it('always provides the dashboard and account security', () => {
		const html = renderNavigation([]);
		expect(html).toContain('href="/admin"');
		expect(html).toContain('Account security');
		expect(html).not.toContain('Add recipe');
		expect(html).not.toContain('Users');
	});

	it('shows editorial and administrative tools by permission', () => {
		const editor = renderNavigation(['posts.create', 'posts.edit_all']);
		const administrator = renderNavigation(['posts.create', 'posts.edit_all', 'roles.manage', 'settings.manage', 'users.manage']);
		expect(editor).toContain('Recipes');
		expect(editor).toContain('Articles');
		expect(editor).toContain('Recipe categories');
		expect(editor).toContain('Article tags');
		expect(editor).toContain('Add recipe');
		expect(editor).toContain('Add article');
		expect(editor).not.toContain('Users');
		expect(administrator).toContain('Users');
		expect(administrator).toContain('Roles');
		expect(administrator).toContain('Settings');
		expect(administrator).toContain('Recipe categories');
		expect(administrator).toContain('Article tags');
	});
});
