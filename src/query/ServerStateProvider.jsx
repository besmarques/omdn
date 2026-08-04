import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { subscribeToAuthenticationLoss } from '../api/authApi';
import createQueryClient from './createQueryClient';
import { currentAccountQueryKey, unauthenticatedAccount } from './currentAccountQuery';

function AuthenticationCacheController({ children, queryClient }) {
	const navigate = useNavigate();

	useEffect(
		() =>
			subscribeToAuthenticationLoss(() => {
				queryClient.removeQueries({ predicate: (query) => query.meta?.private === true });
				queryClient.setQueryData(currentAccountQueryKey, unauthenticatedAccount);
				navigate('/login', { replace: true });
			}),
		[navigate, queryClient],
	);

	return children;
}

export default function ServerStateProvider({ children }) {
	const [queryClient] = useState(createQueryClient);

	return (
		<QueryClientProvider client={queryClient}>
			<AuthenticationCacheController queryClient={queryClient}>{children}</AuthenticationCacheController>
		</QueryClientProvider>
	);
}
