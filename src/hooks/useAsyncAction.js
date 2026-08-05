import { useState } from 'react';

export default function useAsyncAction() {
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState({});
	const [submitting, setSubmitting] = useState(false);

	async function run(action) {
		setMessage('');
		setErrors({});
		setSubmitting(true);

		try {
			return await action();
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
			return null;
		} finally {
			setSubmitting(false);
		}
	}

	function reset() {
		setMessage('');
		setErrors({});
	}

	return { errors, message, reset, run, setErrors, setMessage, submitting };
}
