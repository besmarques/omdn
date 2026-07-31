import { Route, Routes } from 'react-router';

import DesignSystemPage from '@/pages/dev/DesignSystemPage';

export default function DevRoutes() {
	return (
		<Routes>
			<Route path="design-system" element={<DesignSystemPage />} />
		</Routes>
	);
}
