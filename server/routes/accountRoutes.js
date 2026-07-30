import express from 'express';

export default function createAccountRoutes() {
	const router = express.Router();

	router.get('/me', (req, res) => {
		res.json({
			status: true,
			data: req.auth,
		});
	});

	return router;
}