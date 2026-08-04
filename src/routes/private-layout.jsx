import { Outlet, redirect } from 'react-router';

import SiteHeader from '../components/SiteHeader';
import { normalizeCurrentAccount, useCurrentAccount } from '../query/currentAccountQuery';

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

export default function PrivateLayout({ loaderData }) {
	const { data: account } = useCurrentAccount({
		initialData: () => normalizeCurrentAccount(loaderData.principal),
	});

	return (
		<>
			<SiteHeader principal={account} />
			<Outlet />
		</>
	);
}
