import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCurrentAccount, subscribeToAuthenticationLoss } from './authApi';

function jsonResponse(body, status) {
	return new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json' },
		status,
	});
}

describe('authentication API state notifications', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('notifies subscribers when an API request loses authentication', async () => {
		const listener = vi.fn();
		const unsubscribe = subscribeToAuthenticationLoss(listener);

		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ message: 'Authentication required' }, 401))),
		);

		await getCurrentAccount();
		expect(listener).toHaveBeenCalledOnce();

		unsubscribe();
		await getCurrentAccount();
		expect(listener).toHaveBeenCalledOnce();
	});

	it('does not report unrelated server failures as authentication loss', async () => {
		const listener = vi.fn();
		const unsubscribe = subscribeToAuthenticationLoss(listener);

		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Server failure' }, 500)));

		await getCurrentAccount();
		expect(listener).not.toHaveBeenCalled();
		unsubscribe();
	});
});
