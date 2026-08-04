import { queryOptions, useQuery } from '@tanstack/react-query';

import { getCurrentAccount } from '../api/authApi';

export const currentAccountQueryKey = Object.freeze(['account', 'current']);
export const unauthenticatedAccount = Object.freeze({ authenticated: false });

export function normalizeCurrentAccount(account) {
	if (!account?.user || !Array.isArray(account.roles) || !Array.isArray(account.permissions)) {
		throw new Error('The server returned an invalid current account');
	}

	return Object.freeze({
		authenticated: true,
		permissions: Object.freeze([...account.permissions]),
		roles: Object.freeze([...account.roles]),
		user: Object.freeze({
			...account.user,
			displayName: account.user.displayName ?? account.user.display_name,
		}),
	});
}

async function fetchCurrentAccount() {
	const result = await getCurrentAccount();

	if (result.status === 401) {
		return unauthenticatedAccount;
	}

	if (!result.ok) {
		throw new Error(result.body?.message ?? 'Unable to load the current account');
	}

	return normalizeCurrentAccount(result.body?.data);
}

export function currentAccountQueryOptions() {
	return queryOptions({
		meta: { private: true },
		queryKey: currentAccountQueryKey,
		queryFn: fetchCurrentAccount,
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function useCurrentAccount(options = {}) {
	return useQuery({ ...currentAccountQueryOptions(), ...options });
}
