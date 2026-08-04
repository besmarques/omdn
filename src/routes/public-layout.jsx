import { Outlet } from 'react-router';

import SiteHeader from '../components/SiteHeader';

export function headers() {
	return {
		'Cache-Control': 'public, max-age=0, must-revalidate',
	};
}

export default function PublicLayout() {
	return (
		<>
			<SiteHeader />
			<Outlet />
		</>
	);
}
