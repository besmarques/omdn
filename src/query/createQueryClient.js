import { QueryClient } from '@tanstack/react-query';

export default function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			mutations: {
				retry: false,
			},
			queries: {
				refetchOnWindowFocus: false,
				retry: false,
				staleTime: 30_000,
			},
		},
	});
}
