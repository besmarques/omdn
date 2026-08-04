import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { verifyEmail } from '@/api/authApi';

export default function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');
	const verificationStarted = useRef(false);
	const [message, setMessage] = useState(token ? 'Verifying email...' : 'Invalid verification link');

	useEffect(() => {
		if (!token || verificationStarted.current) {
			return;
		}

		verificationStarted.current = true;

		async function submitVerification() {
			try {
				const result = await verifyEmail(token);

				setMessage(result.body?.message ?? (result.ok ? 'Email verified' : 'Email verification failed'));
			} catch (error) {
				setMessage(error.message || 'Unable to contact the server');
			}
		}

		void submitVerification();
	}, [token]);

	return (
		<main>
			<h1>Email verification</h1>
			<p>{message}</p>
			<p>
				<Link to="/login">Go to login</Link>
			</p>
		</main>
	);
}
