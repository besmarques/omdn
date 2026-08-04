import { Outlet } from 'react-router';

export function headers() {
	return {
		'Cache-Control': 'private, no-store',
	};
}

export default function AuthLayout() {
	return <Outlet />;
}
