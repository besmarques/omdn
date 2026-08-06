export default function createPublicMediaController(repository, storage) {
	return async function publicMedia(req, res, next) {
		try {
			const file = await repository.findPublicFile(req.params.uuid, req.params.variant);
			if (!file) return res.status(404).end();
			res.type(file.mime_type).set('Cache-Control', 'public, max-age=31536000, immutable');
			return res.send(await storage.read(file.storage_key));
		} catch (error) {
			return next(error);
		}
	};
}
