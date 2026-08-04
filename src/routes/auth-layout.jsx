import { Outlet } from 'react-router';

import SiteHeader from '../components/SiteHeader';

export function headers() {
	return {
		'Cache-Control': 'private, no-store',
	};
}

export default function AuthLayout() {
	return (
		<>
			<SiteHeader />
			<Outlet />
		</>
	);
}
