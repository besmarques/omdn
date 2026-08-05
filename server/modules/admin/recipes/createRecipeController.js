import { createRecipeSchema } from './createRecipeSchema.js';

export default function createRecipeController(createRecipe) {
	return async function create(req, res, next) {
		const validation = createRecipeSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid recipe data',
				errors: validation.error.flatten().fieldErrors,
			});
		}

		if (
			validation.data.publish &&
			!req.auth.permissions.some((permission) => ['posts.publish_own', 'posts.publish_all'].includes(permission))
		) {
			return res.status(403).json({ status: false, message: 'You do not have permission to publish recipes' });
		}

		try {
			const recipe = await createRecipe(validation.data, {
				displayName: req.auth.user.display_name,
				id: req.auth.user.id,
			});

			return res.status(201).json({ status: true, data: recipe });
		} catch (error) {
			if (error.code === 'ER_DUP_ENTRY') {
				return res.status(409).json({ status: false, message: 'That recipe slug is already in use' });
			}

			return next(error);
		}
	};
}
