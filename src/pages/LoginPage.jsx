import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { getCurrentAccount, login } from '@/api/authApi';

export default function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		setMessage('');
		setSubmitting(true);

		try {
			const result = await login({ email, password, rememberMe });

			if (result.status === 202) {
				setMessage('Two-factor authentication is required. The TOTP screen is not implemented yet.');
				return;
			}

			if (!result.ok) {
				setMessage(result.body?.message ?? 'Login failed');
				return;
			}

			const accountResult = await getCurrentAccount();

			if (!accountResult.ok) {
				setMessage(accountResult.body?.message ?? 'Unable to load the authenticated account');
				return;
			}

			const permissions = accountResult.body?.data?.permissions ?? [];

			if (permissions.includes('users.manage')) {
				navigate('/admin');
				return;
			}

			setMessage('Login successful. This account does not have administrator access.');
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main>
			<h1>Login</h1>

			<form onSubmit={handleSubmit}>
				<label htmlFor="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
				/>

				<label htmlFor="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>

				<label htmlFor="remember-me">
					<input
						id="remember-me"
						name="rememberMe"
						type="checkbox"
						checked={rememberMe}
						onChange={(event) => setRememberMe(event.target.checked)}
					/>
					Remember me for 30 days
				</label>

				<button type="submit" disabled={submitting}>
					{submitting ? 'Logging in...' : 'Login'}
				</button>
			</form>

			{message && <p>{message}</p>}

			<p>
				<Link to="/register">Create an account</Link>
			</p>
		</main>
	);
}
