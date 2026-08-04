import { useState } from 'react';
import { useNavigate } from 'react-router';

import { logout } from '@/api/authApi';

export default function AdminPage({ authorized, principal }) {
	const navigate = useNavigate();
	const [message, setMessage] = useState(authorized ? 'You have access to this admin route' : 'Forbidden');

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
			{authorized && <p>Signed in as {principal.user.email}</p>}
			<button type="button" onClick={handleLogout}>
				Logout
			</button>
		</main>
	);
}
