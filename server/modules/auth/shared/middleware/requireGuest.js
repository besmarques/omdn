export default function requireGuest(req, res, next) {
	if (req.session?.userId) {
		return res.status(403).json({
			status: false,
			message: 'You are already authenticated',
		});
	}

	return next();
}
