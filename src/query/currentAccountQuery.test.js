import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/authApi', () => ({
	getCurrentAccount: vi.fn(),
}));

import { getCurrentAccount } from '../api/authApi';

import { currentAccountQueryKey, currentAccountQueryOptions, normalizeCurrentAccount, unauthenticatedAccount } from './currentAccountQuery';

describe('current account query', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('normalizes backend account data into the shared browser shape', () => {
		expect(
			normalizeCurrentAccount({
				permissions: ['users.manage'],
				roles: ['administrator'],
				user: { display_name: 'Admin', email: 'admin@example.com', id: 1 },
			}),
		).toEqual({
			authenticated: true,
			permissions: ['users.manage'],
			roles: ['administrator'],
			user: { display_name: 'Admin', displayName: 'Admin', email: 'admin@example.com', id: 1 },
		});
	});

	it('uses one stable key and does not become stale automatically', () => {
		const options = currentAccountQueryOptions();

		expect(options.queryKey).toBe(currentAccountQueryKey);
		expect(options.staleTime).toBe(Number.POSITIVE_INFINITY);
	});

	it('returns an unauthenticated snapshot for HTTP 401', async () => {
		getCurrentAccount.mockResolvedValue({ ok: false, status: 401, body: { message: 'Authentication required' } });

		await expect(currentAccountQueryOptions().queryFn()).resolves.toBe(unauthenticatedAccount);
	});

	it('rejects other API failures', async () => {
		getCurrentAccount.mockResolvedValue({ ok: false, status: 500, body: { message: 'Account lookup failed' } });

		await expect(currentAccountQueryOptions().queryFn()).rejects.toThrow('Account lookup failed');
	});
});
