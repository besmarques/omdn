import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/authApi', () => ({ getTotpStatus: vi.fn() }));

import { getTotpStatus } from '../api/authApi';
import { accountSecurityQueryKeys, totpStatusQueryOptions } from './accountSecurityQuery';

describe('account security query', () => {
	beforeEach(() => vi.clearAllMocks());

	it('marks status as private and normalizes the response', async () => {
		getTotpStatus.mockResolvedValue({ ok: true, body: { data: { enabled: true } } });
		const options = totpStatusQueryOptions();

		expect(options.queryKey).toBe(accountSecurityQueryKeys.totp);
		expect(options.meta).toEqual({ private: true });
		await expect(options.queryFn()).resolves.toEqual({ enabled: true });
	});

	it('rejects failed and malformed responses', async () => {
		getTotpStatus.mockResolvedValueOnce({ ok: false, body: { message: 'Status failed' } });
		await expect(totpStatusQueryOptions().queryFn()).rejects.toThrow('Status failed');

		getTotpStatus.mockResolvedValueOnce({ ok: true, body: { data: {} } });
		await expect(totpStatusQueryOptions().queryFn()).rejects.toThrow('invalid two-factor');
	});
});
