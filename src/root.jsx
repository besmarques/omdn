import { StrictMode } from 'react';
import { Outlet, Scripts, ScrollRestoration } from 'react-router';

import '@/index.css';

export default function Root() {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
				<title>omdn</title>
			</head>
			<body>
				<StrictMode>
					<Outlet />
				</StrictMode>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}
