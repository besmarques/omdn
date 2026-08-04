import { describe, expect, it } from 'vitest';

import createQueryClient from './createQueryClient';

describe('query client', () => {
	it('creates isolated clients with conservative defaults', () => {
		const first = createQueryClient();
		const second = createQueryClient();

		expect(first).not.toBe(second);
		expect(first.getQueryCache()).not.toBe(second.getQueryCache());
		expect(first.getDefaultOptions()).toMatchObject({
			mutations: { retry: false },
			queries: {
				refetchOnWindowFocus: false,
				retry: false,
				staleTime: 30_000,
			},
		});
	});
});
