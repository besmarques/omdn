import express from 'express';

export default function createApiRoutes(db) {
	const router = express.Router();

	router.get('/', (req, res) => {
		res.json({
			status: true,
			message: 'OMDN API is running',
		});
	});

	router.get('/test-items', async (req, res) => {
		try {
			const [items] = await db.execute(`
				SELECT id, name, description, created_at
				FROM test_items
				ORDER BY id
			`);

			res.json({
				status: true,
				data: items,
			});
		} catch (error) {
			console.error('Failed to load test items:', error);

			res.status(500).json({
				status: false,
				message: 'Failed to load test items',
			});
		}
	});

	router.use((req, res) => {
		res.status(404).json({
			status: false,
			message: 'API route not found',
		});
	});

	return router;
}