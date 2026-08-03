import { registerSchema } from '#server/modules/auth/shared/authSchemas';

const registrationResponse = {
	status: true,
	message: 'If the email address can be registered, a verification email will be sent.',
};

export default function createRegisterController(registerService) {
	return async function register(req, res, next) {
		const validation = registerSchema.safeParse(req.body);

		if (!validation.success) {
			return res.status(400).json({
				status: false,
				message: 'Invalid registration data',
				errors: validation.error.flatten().fieldErrors,
			});
		}

		try {
			await registerService(validation.data);

			return res.status(202).json(registrationResponse);
		} catch (error) {
			return next(error);
		}
	};
}
