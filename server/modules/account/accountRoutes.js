import express from 'express';

import { createPasswordChangeRateLimiter } from '#server/modules/auth/shared/middleware/authRateLimiters';

export default function createAccountRoutes({
	changePasswordAudit,
	changePasswordController,
	createRateLimitStore,
	deleteAccountAudit,
	deleteAccountController,
	getCurrentAccountController,
}) {
	const router = express.Router();
	const passwordChangeRateLimiter = createPasswordChangeRateLimiter(createRateLimitStore);

	router.get('/me', getCurrentAccountController);

	router.post('/password/change', changePasswordAudit, passwordChangeRateLimiter, changePasswordController);

	router.delete('/', deleteAccountAudit, deleteAccountController);

	return router;
}
