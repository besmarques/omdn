import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

import { login, verifyTotpLogin } from '@/api/authApi';
import { currentAccountQueryKey, currentAccountQueryOptions } from '@/query/currentAccountQuery';
import useHydrated from '@/hooks/useHydrated';

export default function LoginPage() {
	const ready = useHydrated();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [authenticationCode, setAuthenticationCode] = useState('');
	const [challenge, setChallenge] = useState(null);
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);

	if (!ready) {
		return (
			<main>
				<h1>Login</h1>
				<p>Loading login form…</p>
			</main>
		);
	}

	async function finishAuthenticatedLogin() {
		queryClient.removeQueries({ queryKey: currentAccountQueryKey, exact: true });
		await queryClient.fetchQuery(currentAccountQueryOptions());
		navigate('/admin');
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setMessage('');
		setSubmitting(true);

		try {
			const result = await login({ email, password, rememberMe });

			if (!result.ok) {
				setMessage(result.body?.message ?? 'Login failed');
				return;
			}

			if (result.body?.data?.authenticationState === 'totp_required') {
				setChallenge(result.body.data);
				setMessage('Enter an authenticator code or recovery code.');
				return;
			}

			await finishAuthenticatedLogin();
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleChallengeSubmit(event) {
		event.preventDefault();
		setMessage('');
		setSubmitting(true);

		try {
			const result = await verifyTotpLogin(authenticationCode);

			if (!result.ok) {
				const challengeData = result.body?.data;

				if (challengeData?.authenticationState === 'totp_required') {
					setChallenge(challengeData);
				} else {
					setChallenge(null);
					setAuthenticationCode('');
				}

				setMessage(result.body?.message ?? 'Two-factor authentication failed');
				return;
			}

			await finishAuthenticatedLogin();
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main>
			<h1>Login</h1>

			{challenge ? (
				<form onSubmit={handleChallengeSubmit}>
					<label htmlFor="authentication-code">Authenticator or recovery code</label>
					<input
						id="authentication-code"
						name="authenticationCode"
						type="text"
						autoComplete="one-time-code"
						required
						maxLength={32}
						value={authenticationCode}
						onChange={(event) => setAuthenticationCode(event.target.value)}
					/>

					<p>{challenge.remainingAttempts} attempts remaining.</p>
					<button type="submit" disabled={submitting}>
						{submitting ? 'Verifying...' : 'Verify and login'}
					</button>
					<button
						type="button"
						onClick={() => {
							setChallenge(null);
							setAuthenticationCode('');
							setMessage('');
						}}
					>
						Start over
					</button>
				</form>
			) : (
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
			)}

			{message && <p>{message}</p>}

			<p>
				<Link to="/register">Create an account</Link>
			</p>
		</main>
	);
}
