import { z } from 'zod';

const actionSchema = z.enum(['publish', 'restore', 'schedule', 'trash', 'unpublish']);
const inputSchema = z.object({ expectedLockVersion: z.number().int().positive(), publishAt: z.iso.datetime().optional() }).strict();

function hasScopedPermission(req, ownerUserId, capability) {
	return (
		req.auth.permissions.includes(`posts.${capability}_all`) ||
		(req.auth.permissions.includes(`posts.${capability}_own`) && Number(ownerUserId) === Number(req.auth.user.id))
	);
}

export default function createPostLifecycleController(editRepository, lifecycleRepository, now = () => new Date()) {
	return async function transition(req, res, next) {
		const action = actionSchema.safeParse(req.params.action);
		const input = inputSchema.safeParse(req.body);
		if (!action.success) return res.status(404).json({ status: false, message: 'Post action not found' });
		if (!input.success)
			return res.status(400).json({ status: false, message: 'Invalid post action', errors: input.error.flatten().fieldErrors });
		if (action.data === 'schedule' && (!input.data.publishAt || new Date(input.data.publishAt) <= now()))
			return res.status(400).json({ status: false, message: 'Choose a future publication date' });
		if (action.data !== 'schedule' && input.data.publishAt)
			return res.status(400).json({ status: false, message: 'A publication date is only valid when scheduling' });
		try {
			const post = await editRepository.findById(req.params.contentType, Number(req.params.id), { includeTrashed: true });
			if (!post) return res.status(404).json({ status: false, message: 'Post not found' });
			const capability = ['trash', 'restore'].includes(action.data) ? 'delete' : 'publish';
			if (!hasScopedPermission(req, post.owner_user_id, capability)) return res.status(403).json({ status: false, message: 'Forbidden' });
			const result = await lifecycleRepository.transition({
				action: action.data,
				actorId: req.auth.user.id,
				contentType: req.params.contentType,
				expectedLockVersion: input.data.expectedLockVersion,
				id: post.id,
				publishAt: input.data.publishAt ? new Date(input.data.publishAt) : undefined,
			});
			return result ? res.json({ status: true, data: result }) : res.status(404).json({ status: false, message: 'Post not found' });
		} catch (error) {
			if (error.code === 'EDIT_CONFLICT' || error.code === 'INVALID_TRANSITION')
				return res.status(409).json({ status: false, message: error.message });
			return next(error);
		}
	};
}
