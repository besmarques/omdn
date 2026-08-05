const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const authenticationLossListeners = new Set();
let csrfToken;

export function subscribeToAuthenticationLoss(listener) {
	authenticationLossListeners.add(listener);

	return () => authenticationLossListeners.delete(listener);
}

function notifyAuthenticationLoss() {
	for (const listener of authenticationLossListeners) {
		listener();
	}
}

async function readResponse(response) {
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

async function getCsrfToken() {
	if (csrfToken) {
		return csrfToken;
	}

	const response = await fetch('/api/auth/csrf', {
		credentials: 'include',
		headers: {
			accept: 'application/json',
		},
	});
	const result = await readResponse(response);
	const issuedToken = result.body?.data?.csrfToken;

	if (!result.ok || typeof issuedToken !== 'string') {
		throw new Error(result.body?.message ?? 'Unable to establish request security');
	}

	csrfToken = issuedToken;

	return csrfToken;
}

export async function requestApi(path, options = {}, retryCsrf = true) {
	const method = String(options.method ?? 'GET').toUpperCase();
	const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
	const requestToken = safeMethods.has(method) ? null : await getCsrfToken();
	const response = await fetch(path, {
		credentials: 'include',
		...options,
		headers: {
			accept: 'application/json',
			...(options.body === undefined || multipart ? {} : { 'content-type': 'application/json' }),
			...(requestToken ? { 'x-csrf-token': requestToken } : {}),
			...options.headers,
		},
	});
	const result = await readResponse(response);

	if (result.status === 403 && result.body?.code === 'CSRF_TOKEN_INVALID' && retryCsrf) {
		csrfToken = undefined;

		return requestApi(path, options, false);
	}

	if (result.status === 401) {
		notifyAuthenticationLoss();
	}

	return result;
}

export async function login(credentials) {
	const result = await requestApi('/api/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials),
	});

	if (result.ok) {
		csrfToken = undefined;
	}

	return result;
}

export async function verifyTotpLogin(code) {
	const result = await requestApi('/api/auth/totp/login/verify', {
		method: 'POST',
		body: JSON.stringify({ code }),
	});

	if (result.ok) {
		csrfToken = undefined;
	}

	return result;
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

export function getTotpStatus() {
	return requestApi('/api/auth/totp/status');
}

export function setupTotp() {
	return requestApi('/api/auth/totp/setup', { method: 'POST' });
}

export function enableTotp(code) {
	return requestApi('/api/auth/totp/enable', {
		method: 'POST',
		body: JSON.stringify({ code }),
	});
}

export function regenerateTotpRecoveryCodes(code) {
	return requestApi('/api/auth/totp/recovery-codes/regenerate', {
		method: 'POST',
		body: JSON.stringify({ code }),
	});
}

export function disableTotp({ code, password }) {
	return requestApi('/api/auth/totp/disable', {
		method: 'POST',
		body: JSON.stringify({ code, password }),
	});
}

export async function logout() {
	const result = await requestApi('/api/auth/logout', {
		method: 'POST',
	});

	if (result.ok) {
		csrfToken = undefined;
	}

	return result;
}
