import { Outlet, redirect } from 'react-router';

import { principalContext } from '#framework/contexts';

export function headers() {
	return {
		'Cache-Control': 'private, no-store',
	};
}

export function loader({ context }) {
	const principal = context.get(principalContext);

	if (!principal.authenticated) {
		throw redirect('/login');
	}

	return { principal };
}

export default function PrivateLayout() {
	return <Outlet />;
}
