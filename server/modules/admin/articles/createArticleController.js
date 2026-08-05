import { createArticleSchema } from './createArticleSchema.js';

export default function createArticleController(createArticle) {
	return async function create(req, res, next) {
		const validation = createArticleSchema.safeParse(req.body);
		if (!validation.success)
			return res.status(400).json({ status: false, message: 'Invalid article data', errors: validation.error.flatten().fieldErrors });
		if (
			validation.data.publication !== 'draft' &&
			!req.auth.permissions.some((permission) => ['posts.publish_own', 'posts.publish_all'].includes(permission))
		)
			return res.status(403).json({ status: false, message: 'You do not have permission to publish or schedule articles' });
		try {
			const article = await createArticle(validation.data, { displayName: req.auth.user.display_name, id: req.auth.user.id });
			return res.status(201).json({ status: true, data: article });
		} catch (error) {
			if (error instanceof RangeError || error instanceof TypeError) return res.status(400).json({ status: false, message: error.message });
			if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ status: false, message: 'That article slug is already in use' });
			return next(error);
		}
	};
}
