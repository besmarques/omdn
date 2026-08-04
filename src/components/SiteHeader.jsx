import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { logout } from '../api/authApi';
import { currentAccountQueryKey, unauthenticatedAccount } from '../query/currentAccountQuery';

export default function SiteHeader({ principal }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const authenticated = Boolean(principal?.authenticated);

	async function handleLogout() {
		setMessage('');
		setSubmitting(true);

		try {
			const result = await logout();

			if (!result.ok) {
				setMessage(result.body?.message ?? 'Logout failed');
				return;
			}

			queryClient.removeQueries({ predicate: (query) => query.meta?.private === true });
			queryClient.setQueryData(currentAccountQueryKey, unauthenticatedAccount);
			navigate('/login', { replace: true });
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<header>
			<nav aria-label="Main navigation">
				<Link to="/">Home</Link>{' '}
				{authenticated ? (
					<>
						<Link to="/account/security">Account security</Link>{' '}
						{principal.permissions.includes('users.manage') && <Link to="/admin">Admin</Link>}{' '}
						<button type="button" disabled={submitting} onClick={handleLogout}>
							{submitting ? 'Logging out...' : 'Logout'}
						</button>
					</>
				) : (
					<>
						<Link to="/login">Login</Link> <Link to="/register">Register</Link>
					</>
				)}
			</nav>
			{authenticated && <p>Signed in as {principal.user.email}</p>}
			{message && <p>{message}</p>}
		</header>
	);
}
