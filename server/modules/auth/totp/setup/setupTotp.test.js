import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('otplib', () => ({
	generateSecret: vi.fn(),
	generateURI: vi.fn(),
}));

vi.mock('qrcode', () => ({
	default: {
		toDataURL: vi.fn(),
	},
}));

vi.mock('#server/modules/auth/totp/shared/totpEncryption', () => ({
	encryptTotpSecret: vi.fn(),
}));

import { generateSecret, generateURI } from 'otplib';

import QRCode from 'qrcode';

import { encryptTotpSecret } from '#server/modules/auth/totp/shared/totpEncryption';

import createSetupTotpController from '#server/modules/auth/totp/setup/setupTotpController';
import createSetupTotpService from '#server/modules/auth/totp/setup/setupTotpService';

function createRepositoryMock({ existingTotp = null } = {}) {
	const connection = {
		beginTransaction: vi.fn().mockResolvedValue(),
		commit: vi.fn().mockResolvedValue(),
		rollback: vi.fn().mockResolvedValue(),
	};

	const authRepository = {
		withConnection: vi.fn(async (callback) => callback(connection)),

		findTotpByUserIdForUpdate: vi.fn().mockResolvedValue(existingTotp),

		savePendingTotp: vi.fn().mockResolvedValue(),
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

describe('setup TOTP', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		generateSecret.mockReturnValue('BASE32SECRET');

		generateURI.mockReturnValue('otpauth://totp/example');

		QRCode.toDataURL.mockResolvedValue('data:image/png;base64,QRCode');

		encryptTotpSecret.mockReturnValue('encrypted-secret');
	});

	it('creates a pending TOTP configuration', async () => {
		const { authRepository, connection } = createRepositoryMock();

		const setupTotpService = createSetupTotpService({
			totpRepository: authRepository,
			withConnection: authRepository.withConnection,
		});

		const result = await setupTotpService({
			userId: 42,
			email: 'test@example.com',
		});

		expect(generateSecret).toHaveBeenCalledOnce();

		expect(generateURI).toHaveBeenCalledWith({
			issuer: 'O Melhor do Natal',
			label: 'test@example.com',
			secret: 'BASE32SECRET',
			algorithm: 'sha1',
			digits: 6,
			period: 30,
		});

		expect(QRCode.toDataURL).toHaveBeenCalledWith('otpauth://totp/example', {
			errorCorrectionLevel: 'M',
			margin: 2,
			width: 320,
		});

		expect(encryptTotpSecret).toHaveBeenCalledWith('BASE32SECRET', 42);

		expect(authRepository.findTotpByUserIdForUpdate).toHaveBeenCalledWith(42, connection);

		expect(authRepository.savePendingTotp).toHaveBeenCalledWith(42, 'encrypted-secret', connection);

		expect(connection.commit).toHaveBeenCalledOnce();

		expect(connection.rollback).not.toHaveBeenCalled();

		expect(result).toEqual({
			created: true,
			secret: 'BASE32SECRET',
			qrCode: 'data:image/png;base64,QRCode',
		});
	});

	it('rejects setup when TOTP is already enabled', async () => {
		const { authRepository, connection } = createRepositoryMock({
			existingTotp: {
				user_id: 42,
				is_enabled: 1,
			},
		});

		const setupTotpService = createSetupTotpService({
			totpRepository: authRepository,
			withConnection: authRepository.withConnection,
		});

		const result = await setupTotpService({
			userId: 42,
			email: 'test@example.com',
		});

		expect(result).toEqual({
			created: false,
			code: 'TOTP_ALREADY_ENABLED',
		});

		expect(authRepository.savePendingTotp).not.toHaveBeenCalled();

		expect(connection.rollback).toHaveBeenCalledOnce();

		expect(connection.commit).not.toHaveBeenCalled();
	});

	it('returns the setup data through the controller', async () => {
		const setupTotpService = vi.fn().mockResolvedValue({
			created: true,
			secret: 'BASE32SECRET',
			qrCode: 'data:image/png;base64,QRCode',
		});

		const controller = createSetupTotpController(setupTotpService);

		const req = {
			auth: {
				user: {
					id: 42,
					email: 'test@example.com',
				},
			},
		};

		const res = createResponseMock();
		const next = vi.fn();

		await controller(req, res, next);

		expect(setupTotpService).toHaveBeenCalledWith({
			userId: 42,
			email: 'test@example.com',
		});

		expect(res.json).toHaveBeenCalledWith({
			status: true,
			message: 'Scan the QR code and confirm with your authenticator code',
			data: {
				secret: 'BASE32SECRET',
				qrCode: 'data:image/png;base64,QRCode',
			},
		});

		expect(next).not.toHaveBeenCalled();
	});

	it('returns conflict when TOTP is already enabled', async () => {
		const setupTotpService = vi.fn().mockResolvedValue({
			created: false,
			code: 'TOTP_ALREADY_ENABLED',
		});

		const controller = createSetupTotpController(setupTotpService);

		const req = {
			auth: {
				user: {
					id: 42,
					email: 'test@example.com',
				},
			},
		};

		const res = createResponseMock();
		const next = vi.fn();

		await controller(req, res, next);

		expect(res.status).toHaveBeenCalledWith(409);

		expect(res.json).toHaveBeenCalledWith({
			status: false,
			message: 'Two-factor authentication is already enabled',
		});

		expect(next).not.toHaveBeenCalled();
	});
});
