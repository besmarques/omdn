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

	it('returns forbidden for an account without recipe creation permission', () => {
		expect(() => loader({ context: contextWithPermissions(['users.manage']) })).toThrow();

		try {
			loader({ context: contextWithPermissions([]) });
		} catch (error) {
			expect(error).toMatchObject({ init: { status: 403 } });
		}
	});
});
