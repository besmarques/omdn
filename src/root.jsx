import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import '@/index.css';

export function links() {
	return [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }];
}

export function meta() {
	return [{ title: 'omdn' }];
}

export default function Root() {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<Meta />
				<Links />
			</head>
			<body>
				<Outlet />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}
