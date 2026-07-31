import { Route, Routes } from 'react-router';

import HomePage from '@/pages/HomePage';
import DevRoutes from '@/router/DevRoutes';

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />

			{import.meta.env.DEV && <Route path="/dev/*" element={<DevRoutes />} />}

			<Route path="*" element={<div>Page not found</div>} />
		</Routes>
	);
}
