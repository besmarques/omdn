import { Route, Routes } from 'react-router';

import AdminPage from '@/pages/AdminPage';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import DevRoutes from '@/router/DevRoutes';

export default function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<HomePage />} />
			<Route path="/login" element={<LoginPage />} />
			<Route path="/register" element={<RegisterPage />} />
			<Route path="/verify-email" element={<VerifyEmailPage />} />
			<Route path="/admin" element={<AdminPage />} />

			{import.meta.env.DEV && <Route path="/dev/*" element={<DevRoutes />} />}

			<Route path="*" element={<div>Page not found</div>} />
		</Routes>
	);
}
