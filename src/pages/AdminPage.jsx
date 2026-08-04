import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { getCurrentAccount, logout, testAdminAccess } from '@/api/authApi';

export default function AdminPage() {
	const navigate = useNavigate();
	const [message, setMessage] = useState('Checking administrator access...');

	useEffect(() => {
		let active = true;

		async function loadAdminPage() {
			try {
				const accountResult = await getCurrentAccount();

				if (!active) {
					return;
				}

				if (accountResult.status === 401) {
					navigate('/login', { replace: true });
					return;
				}

				const permissions = accountResult.body?.data?.permissions ?? [];

				if (!accountResult.ok || !permissions.includes('users.manage')) {
					setMessage('Forbidden');
					return;
				}

				const adminResult = await testAdminAccess();

				if (active) {
					setMessage(adminResult.body?.message ?? 'Unable to load the admin endpoint');
				}
			} catch (error) {
				if (active) {
					setMessage(error.message || 'Unable to contact the server');
				}
			}
		}

		void loadAdminPage();

		return () => {
			active = false;
		};
	}, [navigate]);

	async function handleLogout() {
		try {
			const result = await logout();

			if (!result.ok) {
				setMessage(result.body?.message ?? 'Logout failed');
				return;
			}

			navigate('/login', { replace: true });
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		}
	}

	return (
		<main>
			<h1>Admin</h1>
			<p>{message}</p>
			<button type="button" onClick={handleLogout}>
				Logout
			</button>
		</main>
	);
}
