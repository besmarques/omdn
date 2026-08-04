import { useState } from 'react';
import { Link } from 'react-router';

import { registerAccount } from '@/api/authApi';

export default function RegisterPage() {
	const [displayName, setDisplayName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);

	async function handleSubmit(event) {
		event.preventDefault();
		setMessage('');
		setErrors({});
		setSubmitting(true);

		try {
			const result = await registerAccount({ displayName, email, password });

			setMessage(result.body?.message ?? (result.ok ? 'Registration request accepted' : 'Registration failed'));
			setErrors(result.body?.errors ?? {});
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main>
			<h1>Register</h1>

			<form onSubmit={handleSubmit}>
				<label htmlFor="displayName">Display name</label>
				<input
					id="displayName"
					name="displayName"
					type="text"
					autoComplete="name"
					required
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
				/>
				{errors.displayName?.map((error) => (
					<p key={error}>{error}</p>
				))}

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
				{errors.email?.map((error) => (
					<p key={error}>{error}</p>
				))}

				<label htmlFor="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
				/>
				{errors.password?.map((error) => (
					<p key={error}>{error}</p>
				))}

				<button type="submit" disabled={submitting}>
					{submitting ? 'Registering...' : 'Register'}
				</button>
			</form>

			{message && <p>{message}</p>}

			<p>
				<Link to="/login">Go to login</Link>
			</p>
		</main>
	);
}
