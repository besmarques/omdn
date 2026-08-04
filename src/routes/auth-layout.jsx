import { Outlet, redirect } from 'react-router';

import SiteHeader from '../components/SiteHeader';

import { principalContext } from '#framework/contexts';

export function headers() {
	return {
		'Cache-Control': 'private, no-store',
	};
}

export function loader({ context }) {
	const principal = context.get(principalContext);

	if (principal.authenticated) {
		throw redirect(principal.permissions.includes('users.manage') ? '/admin' : '/account/security');
	}

	return null;
}

export default function AuthLayout() {
	return (
		<>
			<SiteHeader />
			<Outlet />
		</>
	);
}
