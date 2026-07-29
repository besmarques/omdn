import { Route, Routes } from 'react-router';

import HomePage from '@/pages/HomePage';
import DevRoutesLoader from '@/router/DevRoutesLoader';

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />

			<Route path="/dev/*" element={<DevRoutesLoader />} />

			<Route path="*" element={<div>Page not found</div>} />
		</Routes>
	);
}