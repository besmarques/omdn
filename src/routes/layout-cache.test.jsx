import { describe, expect, it } from 'vitest';

import { headers as authHeaders } from './auth-layout';
import { headers as publicHeaders } from './public-layout';

describe('route layout cache policies', () => {
	it('marks public pages as revalidatable without account-specific data', () => {
		expect(publicHeaders()).toEqual({
			'Cache-Control': 'public, max-age=0, must-revalidate',
		});
	});

	it('prevents authentication pages from being stored', () => {
		expect(authHeaders()).toEqual({
			'Cache-Control': 'private, no-store',
		});
	});
});
