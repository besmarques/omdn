import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from 'react-router';

import ServerStateProvider from './query/ServerStateProvider';

import './index.css';

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
				<ServerStateProvider>
					<Outlet />
				</ServerStateProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	const notFound = isRouteErrorResponse(error) && error.status === 404;

	return <ErrorDocument notFound={notFound} />;
}

export function ErrorDocument({ notFound }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{notFound ? 'Page not found' : 'Unexpected error'}</title>
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
			</head>
			<body>
				<main>
					<h1>{notFound ? 'Page not found' : 'Something went wrong'}</h1>
					{!notFound && <p>Please try again later.</p>}
				</main>
			</body>
		</html>
	);
}
