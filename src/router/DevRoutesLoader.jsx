import { lazy, Suspense } from 'react';

const DevRoutes = import.meta.env.DEV
	? lazy(() => import('@/router/DevRoutes'))
	: null;

export default function DevRoutesLoader() {
	if (!DevRoutes) {
		return null;
	}

	return (
		<Suspense fallback={null}>
			<DevRoutes />
		</Suspense>
	);
}