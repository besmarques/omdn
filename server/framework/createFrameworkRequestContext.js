import { RouterContextProvider } from 'react-router';

import { applicationServicesContext, clockContext, principalContext, requestIdContext } from '#framework/contexts';

const guestPrincipal = Object.freeze({ authenticated: false });

function createPrincipal(auth) {
	if (!auth) {
		return guestPrincipal;
	}

	return Object.freeze({
		authenticated: true,
		permissions: Object.freeze([...auth.permissions]),
		roles: Object.freeze([...auth.roles]),
		user: Object.freeze({ ...auth.user }),
	});
}

export default function createFrameworkRequestContext({ services, clock = Object.freeze({ now: () => new Date() }) }) {
	return function getLoadContext(req) {
		const context = new RouterContextProvider();

		context.set(applicationServicesContext, services);
		context.set(clockContext, clock);
		context.set(principalContext, createPrincipal(req.auth));
		context.set(requestIdContext, req.correlationId);

		return context;
	};
}
