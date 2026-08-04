import { Outlet } from 'react-router';

export function headers() {
	return {
		'Cache-Control': 'public, max-age=0, must-revalidate',
	};
}

export default function PublicLayout() {
	return <Outlet />;
}
