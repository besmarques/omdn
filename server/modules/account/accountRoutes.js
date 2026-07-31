import express from 'express';

export default function createAccountRoutes({
	changePasswordAudit,
	changePasswordController,
	deleteAccountAudit,
	deleteAccountController,
	getCurrentAccountController,
}) {
	const router = express.Router();

	router.get('/me', getCurrentAccountController);

	router.post('/password/change', changePasswordAudit, changePasswordController);

	router.delete('/', deleteAccountAudit, deleteAccountController);

	return router;
}
