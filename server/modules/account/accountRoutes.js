import express from 'express';

export default function createAccountRoutes({ getCurrentAccountController }) {
	const router = express.Router();

	router.get('/me', getCurrentAccountController);

	return router;
}
