import { z } from 'zod';

const typeSchema = z.enum(['recipe', 'article']);
const categorySchema = z
	.object({
		description: z.string().trim().max(2000).optional(),
		name: z.string().trim().min(1).max(120),
		slug: z
			.string()
			.trim()
			.max(200)
			.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
	})
	.strict();
const archiveSeoSchema = z.object({ description: z.string().trim().max(320), title: z.string().trim().max(255) }).strict();

function canEditAll(req) {
	return req.auth.permissions.some((permission) => ['posts.edit_all', 'posts.review_all'].includes(permission));
}
function canView(req) {
	return canEditAll(req) || req.auth.permissions.includes('posts.edit_own');
}

export default function createAdminContentTypeController(repository) {
	async function get(req, res, next) {
		const type = typeSchema.safeParse(req.params.contentType);
		if (!type.success) return res.status(404).json({ status: false, message: 'Content type not found' });
		if (!canView(req)) return res.status(403).json({ status: false, message: 'Forbidden' });
		try {
			const result = await repository.get(type.data, { ownerUserId: canEditAll(req) ? null : req.auth.user.id });
			return result ? res.json({ status: true, data: result }) : res.status(404).json({ status: false, message: 'Content type not found' });
		} catch (error) {
			return next(error);
		}
	}

	async function createCategory(req, res, next) {
		const type = typeSchema.safeParse(req.params.contentType);
		const input = categorySchema.safeParse(req.body);
		if (!type.success) return res.status(404).json({ status: false, message: 'Content type not found' });
		if (!canEditAll(req)) return res.status(403).json({ status: false, message: 'Forbidden' });
		if (!input.success)
			return res.status(400).json({ status: false, message: 'Invalid category', errors: input.error.flatten().fieldErrors });
		try {
			return res.status(201).json({ status: true, data: await repository.createCategory(type.data, input.data) });
		} catch (error) {
			if (error.code === 'ER_DUP_ENTRY')
				return res.status(409).json({ status: false, message: 'That category name or slug is already in use' });
			return next(error);
		}
	}

	async function updateArchiveSeo(req, res, next) {
		const type = typeSchema.safeParse(req.params.contentType);
		const input = archiveSeoSchema.safeParse(req.body);
		if (!type.success) return res.status(404).json({ status: false, message: 'Content type not found' });
		if (!canEditAll(req)) return res.status(403).json({ status: false, message: 'Forbidden' });
		if (!input.success)
			return res.status(400).json({ status: false, message: 'Invalid archive SEO', errors: input.error.flatten().fieldErrors });
		try {
			return (await repository.updateArchiveSeo(type.data, input.data))
				? res.json({ status: true, data: input.data })
				: res.status(404).json({ status: false, message: 'Content type not found' });
		} catch (error) {
			return next(error);
		}
	}

	return { createCategory, get, updateArchiveSeo };
}
