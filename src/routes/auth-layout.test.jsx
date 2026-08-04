import { RouterContextProvider } from 'react-router';

import { describe, expect, it } from 'vitest';

import { principalContext } from '#framework/contexts';

import { headers, loader } from './auth-layout';

function createContext(principal) {
	const context = new RouterContextProvider();

	context.set(principalContext, principal);

	return context;
}

function expectRedirect(principal, destination) {
	try {
		loader({ context: createContext(principal) });
	} catch (response) {
		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe(destination);
		return;
	}

	throw new Error('Expected the loader to redirect');
}

describe('authentication route layout', () => {
	it('allows guests and pending TOTP sessions to use authentication pages', () => {
		expect(loader({ context: createContext({ authenticated: false }) })).toBeNull();
		expect(headers()).toEqual({ 'Cache-Control': 'private, no-store' });
	});

	it('redirects authenticated administrators away from authentication pages', () => {
		expectRedirect({ authenticated: true, permissions: ['users.manage'] }, '/admin');
	});

	it('redirects other authenticated users to account security', () => {
		expectRedirect({ authenticated: true, permissions: [] }, '/account/security');
	});
});
