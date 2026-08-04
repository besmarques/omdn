import { describe, expect, it } from 'vitest';

import { applicationServicesContext, clockContext, principalContext, requestIdContext } from '#server/framework/contexts';
import createFrameworkRequestContext from '#server/framework/createFrameworkRequestContext';

describe('Framework request context', () => {
	it('creates an isolated RouterContextProvider for every request', () => {
		const services = Object.freeze({ posts: {} });
		const clock = Object.freeze({ now: () => new Date('2026-08-04T12:00:00.000Z') });
		const getLoadContext = createFrameworkRequestContext({ services, clock });
		const first = getLoadContext({
			correlationId: 'first-request',
			auth: {
				user: { id: 1, email: 'first@example.com' },
				roles: ['admin'],
				permissions: ['users.manage'],
			},
		});
		const second = getLoadContext({ correlationId: 'second-request' });

		expect(first).not.toBe(second);
		expect(first.get(applicationServicesContext)).toBe(services);
		expect(first.get(clockContext)).toBe(clock);
		expect(first.get(requestIdContext)).toBe('first-request');
		expect(first.get(principalContext)).toEqual({
			authenticated: true,
			user: { id: 1, email: 'first@example.com' },
			roles: ['admin'],
			permissions: ['users.manage'],
		});
		expect(second.get(requestIdContext)).toBe('second-request');
		expect(second.get(principalContext)).toEqual({ authenticated: false });
	});

	it('copies and freezes principal data so later request mutations cannot leak in', () => {
		const auth = {
			user: { id: 1 },
			roles: ['subscriber'],
			permissions: [],
		};
		const context = createFrameworkRequestContext({ services: Object.freeze({}) })({
			correlationId: 'request',
			auth,
		});
		const principal = context.get(principalContext);

		auth.user.id = 2;
		auth.roles.push('admin');

		expect(principal.user.id).toBe(1);
		expect(principal.roles).toEqual(['subscriber']);
		expect(Object.isFrozen(principal)).toBe(true);
		expect(Object.isFrozen(principal.user)).toBe(true);
	});
});
