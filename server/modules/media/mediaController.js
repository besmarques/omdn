import { z } from 'zod';
import { supportedImageMimeTypes, supportedImageTypes } from './mediaPolicy.js';

const sizeSchema = z
	.object({
		fit: z.enum(['cover', 'inside']),
		height: z.number().int().min(16).max(8000),
		name: z
			.string()
			.trim()
			.min(1)
			.max(40)
			.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
		width: z.number().int().min(16).max(8000),
	})
	.strict();
const settingsSchema = z
	.object({
		acceptedMimeTypes: z.array(z.enum(supportedImageMimeTypes)).min(1),
		imageSizes: z.array(sizeSchema).min(1).max(12),
		maxSourceHeight: z.number().int().min(16).max(30000),
		maxSourcePixels: z.number().int().min(256).max(100_000_000),
		maxSourceWidth: z.number().int().min(16).max(30000),
		maxUploadBytes: z
			.number()
			.int()
			.min(1024)
			.max(50 * 1024 * 1024),
	})
	.strict()
	.superRefine((settings, context) => {
		if (new Set(settings.acceptedMimeTypes).size !== settings.acceptedMimeTypes.length)
			context.addIssue({ code: 'custom', message: 'Accepted formats must be unique', path: ['acceptedMimeTypes'] });
		if (new Set(settings.imageSizes.map(({ name }) => name)).size !== settings.imageSizes.length)
			context.addIssue({ code: 'custom', message: 'Image size names must be unique', path: ['imageSizes'] });
	});

function canUseMedia(req) {
	return req.auth.permissions.some((permission) =>
		['posts.create', 'posts.edit_own', 'posts.edit_all', 'settings.manage'].includes(permission),
	);
}

export default function createMediaController(repository, service, storage) {
	return {
		async file(req, res, next) {
			if (!canUseMedia(req)) return res.status(403).json({ status: false, message: 'Forbidden' });
			try {
				const record = await repository.findFile(Number(req.params.id), req.params.variant);
				if (!record) return res.status(404).json({ status: false, message: 'Image not found' });
				res.type(record.mime_type).set('Cache-Control', 'private, max-age=3600');
				return res.send(await storage.read(record.storage_key));
			} catch (error) {
				return next(error);
			}
		},
		async list(req, res, next) {
			if (!canUseMedia(req)) return res.status(403).json({ status: false, message: 'Forbidden' });
			try {
				return res.json({ status: true, data: await repository.list() });
			} catch (error) {
				return next(error);
			}
		},
		async settings(req, res, next) {
			if (!req.auth.permissions.includes('settings.manage')) return res.status(403).json({ status: false, message: 'Forbidden' });
			try {
				return res.json({ status: true, data: { ...(await repository.getSettings()), supportedImageTypes } });
			} catch (error) {
				return next(error);
			}
		},
		async updateSettings(req, res, next) {
			if (!req.auth.permissions.includes('settings.manage')) return res.status(403).json({ status: false, message: 'Forbidden' });
			const input = settingsSchema.safeParse(req.body);
			if (!input.success)
				return res.status(400).json({ status: false, message: 'Invalid media settings', errors: input.error.flatten().fieldErrors });
			try {
				return res.json({ status: true, data: await repository.updateSettings(input.data, req.auth.user.id) });
			} catch (error) {
				return next(error);
			}
		},
		async upload(req, res, next) {
			if (!canUseMedia(req)) return res.status(403).json({ status: false, message: 'Forbidden' });
			try {
				const defaultAltText = String(req.body?.defaultAltText ?? '').trim();
				if (defaultAltText.length > 500) return res.status(400).json({ status: false, message: 'Alt text is too long' });
				const asset = await service.upload(req.file, req.auth.user.id, defaultAltText);
				return res.status(201).json({ status: true, data: { id: asset.id, uuid: asset.uuid } });
			} catch (error) {
				if (error instanceof RangeError) return res.status(400).json({ status: false, message: error.message });
				return next(error);
			}
		},
	};
}
