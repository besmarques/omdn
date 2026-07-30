import express from 'express';

export default function createAadminRoutes(db) {
	
	const router = express.Router();

	router.use((req, res) => {
		res.status(404).json({
			status: false,
			message: 'Admin route not found',
		});
	});

	return router;
}