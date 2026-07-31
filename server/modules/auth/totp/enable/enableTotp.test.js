import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('otplib', () => ({
	verify: vi.fn(),
}));

vi.mock('#server/modules/auth/totp/shared/totpEncryption', () => ({
	decryptTotpSecret: vi.fn(),
}));

vi.mock('#server/modules/auth/totp/shared/recoveryCodes', () => ({
	generateRecoveryCodes: vi.fn(),
	hashRecoveryCode: vi.fn(),
}));

import { verify } from 'otplib';

import { decryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

import { generateRecoveryCodes, hashRecoveryCode } from '#server/modules/auth/totp/shared/recoveryCodes';

import createEnableTotpController from '#server/modules/auth/totp/enable/enableTotpController';
import createEnableTotpService from '#server/modules/auth/totp/enable/enableTotpService';

const recoveryCodes = ['AAAA-BBBB-CCCC-DDDD-EEEE', 'FFFF-GGGG-HHHH-IIII-JJJJ'];

function createRepositoryMock({
	totp = {
		user_id: 42,
		secret_encrypted: 'encrypted-secret',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		is_enabled: 0,
		last_used_step: null,
	},
	enabledRows = 1,
} = {}) {
	const connection = {
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		rollback: vi.fn().mockResolvedValue(),
	};

	const authRepository = {
		withConnection: vi.fn(async (callback) => callback(connection)),

		findTotpByUserIdForUpdate: vi.fn().mockResolvedValue(totp),

		replaceRecoveryCodes: vi.fn().mockResolvedValue(),

		enableTotp: vi.fn().mockResolvedValue(enabledRows),
	};

	return {
		authRepository,
		connection,
	};
}

function createResponseMock() {
	const res = {
		status: vi.fn(),
		json: vi.fn(),
	};

	res.status.mockReturnValue(res);
	res.json.mockReturnValue(res);

	return res;
}

describe('enable TOTP', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		decryptTotpSecret.mockReturnValue('BASE32SECRET');

		generateRecoveryCodes.mockReturnValue(recoveryCodes);

		hashRecoveryCode.mockImplementation((code) => `hash:${code}`);
	});

	it('enables a pending TOTP configuration', async () => {
		const { authRepository, connection } = createRepositoryMock();

		verify.mockResolvedValue({
			valid: true,
			epoch: 3030,
			timeStep: 101,
		});

		const enableTotpService = createEnableTotpService(authRepository);

		const result = await enableTotpService({
			userId: 42,
			code: '123456',
		});

		expect(decryptTotpSecret).toHaveBeenCalledWith('encrypted-secret', 42);

		expect(verify).toHaveBeenCalledWith({
			secret: 'BASE32SECRET',
			token: '123456',
			algorithm: 'sha1',
			digits: 6,
			period: 30,
			epochTolerance: 30,
		});

		expect(generateRecoveryCodes).toHaveBeenCalledOnce();

		expect(hashRecoveryCode).toHaveBeenCalledTimes(recoveryCodes.length);

		expect(authRepository.replaceRecoveryCodes).toHaveBeenCalledWith(
			42,
			['hash:AAAA-BBBB-CCCC-DDDD-EEEE', 'hash:FFFF-GGGG-HHHH-IIII-JJJJ'],
			connection,
		);

		expect(authRepository.enableTotp).toHaveBeenCalledWith(42, 101, connection);

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(connection.rollback).not.toHaveBeenCalled();

		expect(result).toEqual({
			enabled: true,
			recoveryCodes,
		});
	});

	it('rejects a missing or already enabled TOTP configuration', async () => {
		const { authRepository, connection } = createRepositoryMock({
			totp: {
				user_id: 42,
				is_enabled: 1,
			},
		});

		const enableTotpService = createEnableTotpService(authRepository);

		const result = await enableTotpService({
			userId: 42,
			code: '123456',
		});

		expect(result).toEqual({
			enabled: false,
		});

		expect(verify).not.toHaveBeenCalled();

		expect(authRepository.replaceRecoveryCodes).not.toHaveBeenCalled();

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();
	});

	it('rejects an invalid authenticator code', async () => {
		const { authRepository, connection } = createRepositoryMock();

		verify.mockResolvedValue({
			valid: false,
		});

		const enableTotpService = createEnableTotpService(authRepository);

		const result = await enableTotpService({
			userId: 42,
			code: '123456',
		});

		expect(result).toEqual({
			enabled: false,
		});

		expect(authRepository.replaceRecoveryCodes).not.toHaveBeenCalled();

		expect(authRepository.enableTotp).not.toHaveBeenCalled();

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();
	});

	it('rolls back when the TOTP record cannot be enabled', async () => {
		const { authRepository, connection } = createRepositoryMock({
			enabledRows: 0,
		});

		verify.mockResolvedValue({
			valid: true,
			epoch: 3030,
			timeStep: 101,
		});

		const enableTotpService = createEnableTotpService(authRepository);

		await expect(
			enableTotpService({
				userId: 42,
				code: '123456',
			}),
		).rejects.toThrow('Unable to enable TOTP');

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();
	});

	it('validates the code before calling the service', async () => {
		const enableTotpService = vi.fn();

		const controller = createEnableTotpController(enableTotpService);

		const req = {
			body: {
				code: 'invalid',
			},

			auth: {
				user: {
					id: 42,
				},
			},
		};

		const res = createResponseMock();
		const next = vi.fn();

		await controller(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);

		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'Invalid authentication code',
		});

		expect(enableTotpService).not.toHaveBeenCalled();

		expect(next).not.toHaveBeenCalled();
	});

	it('returns the generated recovery codes through the controller', async () => {
		const enableTotpService = vi.fn().mockResolvedValue({
			enabled: true,
			recoveryCodes,
		});

		const controller = createEnableTotpController(enableTotpService);

		const req = {
			body: {
				code: '123456',
			},

			auth: {
				user: {
					id: 42,
				},
			},
		};

		const res = createResponseMock();
		const next = vi.fn();

		await controller(req, res, next);

		expect(enableTotpService).toHaveBeenCalledWith({
			userId: 42,
			code: '123456',
		});

		expect(res.json).toHaveBeenCalledWith({
			status: true,
			message: 'Two-factor authentication enabled',
			data: {
				recoveryCodes,
			},
		});

		expect(next).not.toHaveBeenCalled();
	});
});
