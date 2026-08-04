import { RouterContextProvider } from 'react-router';

import { describe, expect, it } from 'vitest';

import { principalContext } from '#framework/contexts';

import { headers, loader } from './private-layout';

function createContext(principal) {
	const context = new RouterContextProvider();

	context.set(principalContext, principal);

	return context;
}

describe('private route layout', () => {
	it('redirects a guest to login', () => {
		expect(() => loader({ context: createContext({ authenticated: false }) })).toThrow();

		try {
			loader({ context: createContext({ authenticated: false }) });
		} catch (response) {
			expect(response.status).toBe(302);
			expect(response.headers.get('location')).toBe('/login');
		}
	});

	it('returns the authenticated principal without exposing a public cache', () => {
		const principal = {
			authenticated: true,
			permissions: ['users.manage'],
			roles: ['administrator'],
			user: { id: 1 },
		};

		expect(loader({ context: createContext(principal) })).toEqual({ principal });
		expect(headers()).toEqual({ 'Cache-Control': 'private, no-store' });
	});
});
