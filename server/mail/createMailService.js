import nodemailer from 'nodemailer';

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

export default function createMailService(config = {}, { createTransport = nodemailer.createTransport, logger = console } = {}) {
	const transport = config.smtp?.enabled
		? createTransport({
				host: config.smtp.host,
				port: config.smtp.port,
				secure: config.smtp.secure,
				...(config.smtp.user
					? {
							auth: {
								pass: config.smtp.password,
								user: config.smtp.user,
							},
						}
					: {}),
			})
		: null;

	return Object.freeze({
		async sendAccountVerification({ displayName, email, token }) {
			if (!transport) {
				if (config.appEnvironment === 'development') {
					logger.log(`Verification token for ${email}: ${token}`);
				}

				return { delivered: false, developmentFallback: true };
			}

			const verificationUrl = new URL('/verify-email', config.publicBaseUrl);
			verificationUrl.searchParams.set('token', token);

			const greeting = displayName ? `Hello ${displayName},` : 'Hello,';
			const safeGreeting = escapeHtml(greeting);
			const safeUrl = escapeHtml(verificationUrl.toString());

			const result = await transport.sendMail({
				from: {
					address: config.smtp.fromEmail,
					name: config.smtp.fromName,
				},
				html: `<p>${safeGreeting}</p><p>Verify your O Melhor do Natal account:</p><p><a href="${safeUrl}">${safeUrl}</a></p>`,
				subject: 'Verify your O Melhor do Natal account',
				text: `${greeting}\n\nVerify your account:\n${verificationUrl.toString()}\n`,
				to: email,
			});

			return { delivered: true, messageId: result.messageId };
		},
	});
}
