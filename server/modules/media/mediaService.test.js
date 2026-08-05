import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import createMediaService from './mediaService';

const settings = {
	acceptedMimeTypes: ['image/jpeg', 'image/png'],
	imageSizes: [
		{ fit: 'cover', height: 64, name: 'thumbnail', width: 64 },
		{ fit: 'inside', height: 800, name: 'large', width: 800 },
	],
	maxSourceHeight: 1000,
	maxSourcePixels: 1_000_000,
	maxSourceWidth: 1000,
	maxUploadBytes: 1_000_000,
};

describe('media service', () => {
	it('decodes, re-encodes, and writes every configured PNG variant', async () => {
		const buffer = await sharp({ create: { background: '#ff0000', channels: 4, height: 100, width: 200 } })
			.png()
			.toBuffer();
		const repository = {
			create: vi.fn(async (asset) => ({ id: 3, ...asset })),
			getSettings: vi.fn().mockResolvedValue(settings),
		};
		const storage = { deletePrefix: vi.fn(), write: vi.fn() };
		const asset = await createMediaService(repository, storage).upload(
			{ buffer, originalname: 'user name.png', size: buffer.length },
			7,
			'A red image',
		);
		expect(asset).toMatchObject({ extension: 'png', height: 100, id: 3, mimeType: 'image/png', width: 200 });
		expect(asset.storageKey).not.toContain('user name');
		expect(asset.variants).toHaveLength(2);
		expect(storage.write).toHaveBeenCalledTimes(3);
	});

	it('rejects decoded formats that administrators have disabled', async () => {
		const buffer = await sharp({ create: { background: '#fff', channels: 3, height: 10, width: 10 } })
			.jpeg()
			.toBuffer();
		const repository = { create: vi.fn(), getSettings: vi.fn().mockResolvedValue({ ...settings, acceptedMimeTypes: ['image/png'] }) };
		await expect(
			createMediaService(repository, { deletePrefix: vi.fn(), write: vi.fn() }).upload(
				{ buffer, originalname: 'fake.png', size: buffer.length },
				7,
			),
		).rejects.toThrow('That image format is not accepted');
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('rejects files that cannot be decoded as JPEG or PNG', async () => {
		const repository = { create: vi.fn(), getSettings: vi.fn().mockResolvedValue(settings) };
		await expect(
			createMediaService(repository, { deletePrefix: vi.fn(), write: vi.fn() }).upload(
				{ buffer: Buffer.from('<svg></svg>'), originalname: 'unsafe.jpg', size: 11 },
				7,
			),
		).rejects.toThrow('not a valid JPEG or PNG');
	});
});
