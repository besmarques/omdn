async function requestApi(path, options = {}) {
	const response = await fetch(path, {
		credentials: 'include',
		...options,
		headers: {
			accept: 'application/json',
			...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
			...options.headers,
		},
	});

	const responseText = await response.text();
	let body = null;

	if (responseText) {
		try {
			body = JSON.parse(responseText);
		} catch {
			throw new Error(`The server returned an unreadable response (HTTP ${response.status})`);
		}
	}

	return {
		body,
		ok: response.ok,
		status: response.status,
	};
}

export function login(credentials) {
	return requestApi('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials),
	});
}

export function registerAccount(account) {
	return requestApi('/api/auth/register', {
		method: 'POST',
		body: JSON.stringify(account),
	});
}

export function verifyEmail(token) {
	return requestApi('/api/auth/email/verify', {
		method: 'POST',
		body: JSON.stringify({ token }),
	});
}

export function getCurrentAccount() {
	return requestApi('/api/account/me');
}

export function testAdminAccess() {
	return requestApi('/api/admin/test');
}

export function logout() {
	return requestApi('/api/auth/logout', {
		method: 'POST',
	});
}
