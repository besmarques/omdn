import { queryOptions, useQuery } from '@tanstack/react-query';

import { getTotpStatus } from '../api/authApi';

export const accountSecurityQueryKeys = Object.freeze({
	all: Object.freeze(['account', 'security']),
	totp: Object.freeze(['account', 'security', 'totp']),
});

async function fetchTotpStatus() {
	const result = await getTotpStatus();

	if (!result.ok) throw new Error(result.body?.message ?? 'Unable to load two-factor authentication status');
	if (typeof result.body?.data?.enabled !== 'boolean') throw new Error('The server returned an invalid two-factor authentication status');

	return Object.freeze({ enabled: result.body.data.enabled });
}

export function totpStatusQueryOptions() {
	return queryOptions({
		meta: { private: true },
		queryKey: accountSecurityQueryKeys.totp,
		queryFn: fetchTotpStatus,
		staleTime: 30_000,
	});
}

export function useTotpStatus() {
	return useQuery(totpStatusQueryOptions());
}
