import express from 'express';

import { issueCsrfToken } from '#server/middleware/csrfMiddleware';
import requireGuest from '#server/modules/auth/shared/middleware/requireGuest';

export default function createAuthRoutes() {
	const router = express.Router();

	router.get('/csrf', issueCsrfToken);

	router.get('/status', (req, res) => {
		const authenticated = Boolean(req.session?.userId);
		const pendingExpiresAt = Number(req.session?.pendingTwoFactorExpiresAt);
		const pendingAttempts = Number(req.session?.pendingTwoFactorAttempts);
		const pendingTwoFactor =
			!authenticated &&
			Boolean(req.session?.pendingTwoFactorUserId) &&
			Number.isFinite(pendingExpiresAt) &&
			pendingExpiresAt > Date.now() &&
			Number.isFinite(pendingAttempts) &&
			pendingAttempts < 5;

		return res.json({
			status: true,
			authenticated,
			authenticationState: authenticated ? 'authenticated' : pendingTwoFactor ? 'totp_required' : 'unauthenticated',
		});
	});

	router.get('/guest-test', requireGuest, (req, res) => {
		return res.json({
			status: true,
			message: 'This route is available only to guests',
		});
	});

	return router;
}
