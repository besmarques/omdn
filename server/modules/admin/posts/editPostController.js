import { createRecipeSchema } from '../recipes/createRecipeSchema.js';
import { createArticleSchema } from '../articles/createArticleSchema.js';

const schemas = Object.freeze({ article: createArticleSchema, recipe: createRecipeSchema });
function canEdit(req, post) {
	return (
		req.auth.permissions.includes('posts.edit_all') ||
		(req.auth.permissions.includes('posts.edit_own') && post.owner_user_id === req.auth.user.id)
	);
}

export default function createEditPostController(repository, normalizers) {
	async function get(req, res, next) {
		try {
			const post = await repository.findById(req.params.contentType, Number(req.params.id));
			if (!post) return res.status(404).json({ status: false, message: 'Post not found' });
			if (!canEdit(req, post)) return res.status(403).json({ status: false, message: 'Forbidden' });
			return res.json({ status: true, data: post });
		} catch (error) {
			return next(error);
		}
	}

	async function update(req, res, next) {
		const schema = schemas[req.params.contentType];
		if (!schema) return res.status(404).json({ status: false, message: 'Content type not found' });
		const { expectedLockVersion, ...body } = req.body ?? {};
		const validation = schema.safeParse(body);
		if (!validation.success || !Number.isSafeInteger(expectedLockVersion) || expectedLockVersion < 1)
			return res.status(400).json({
				status: false,
				message: 'Invalid post data',
				errors: validation.success ? { expectedLockVersion: ['Invalid version'] } : validation.error.flatten().fieldErrors,
			});
		try {
			const existing = await repository.findById(req.params.contentType, Number(req.params.id));
			if (!existing) return res.status(404).json({ status: false, message: 'Post not found' });
			if (!canEdit(req, existing)) return res.status(403).json({ status: false, message: 'Forbidden' });
			const record = await normalizers[req.params.contentType](validation.data, {
				displayName: req.auth.user.display_name,
				id: req.auth.user.id,
			});
			const result = await repository.update({ ...record, contentType: req.params.contentType, expectedLockVersion, id: existing.id });
			return res.json({ status: true, data: result });
		} catch (error) {
			if (error.code === 'EDIT_CONFLICT') return res.status(409).json({ status: false, message: error.message });
			if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ status: false, message: 'That slug is already in use' });
			if (error instanceof RangeError || error instanceof TypeError) return res.status(400).json({ status: false, message: error.message });
			return next(error);
		}
	}
	return { get, update };
}
