import express from 'express';

import {
	createAccountDeletionRateLimiters,
	createPasswordChangeRateLimiter,
} from '#server/modules/auth/shared/middleware/authRateLimiters';

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
	const accountDeletionRateLimiters = createAccountDeletionRateLimiters(createRateLimitStore);

	router.get('/me', getCurrentAccountController);

	router.post('/password/change', changePasswordAudit, passwordChangeRateLimiter, changePasswordController);

	router.delete('/', deleteAccountAudit, ...accountDeletionRateLimiters, deleteAccountController);

	return router;
}
