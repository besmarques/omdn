import { RouterContextProvider } from 'react-router';

import { describe, expect, it } from 'vitest';

import { principalContext } from '#framework/contexts';

import { loader } from './admin-recipe-new';

function contextWithPermissions(permissions) {
	const context = new RouterContextProvider();

	context.set(principalContext, { authenticated: true, permissions });

	return context;
}

describe('admin recipe creation route', () => {
	it('allows creators and exposes their publish capability', () => {
		expect(loader({ context: contextWithPermissions(['posts.create']) })).toEqual({ canPublish: false });
		expect(loader({ context: contextWithPermissions(['posts.create', 'posts.publish_all']) })).toEqual({ canPublish: true });
	});

	it('redirects an account without recipe creation permission to the dashboard', () => {
		for (const permissions of [[], ['users.manage']]) {
			try {
				loader({ context: contextWithPermissions(permissions) });
				expect.unreachable('Expected the loader to redirect');
			} catch (error) {
				expect(error).toBeInstanceOf(Response);
				expect(error.status).toBe(302);
				expect(error.headers.get('Location')).toBe('/admin');
			}
		}
	});
});
