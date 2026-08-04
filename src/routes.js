import { index, layout, route } from '@react-router/dev/routes';

const developmentRoutes =
	process.env.NODE_ENV === 'production'
		? []
		: [
				route('dev/design-system', 'routes/design-system.jsx'),
				route('dev/page-examples/:example?', 'routes/page-presentation-examples.jsx'),
			];

export default [
	layout('routes/public-layout.jsx', [index('routes/home.jsx'), ...developmentRoutes, route('*', 'routes/not-found.jsx')]),
	layout('routes/auth-layout.jsx', [
		route('login', 'routes/login.jsx'),
		route('register', 'routes/register.jsx'),
		route('verify-email', 'routes/verify-email.jsx'),
	]),
	layout('routes/private-layout.jsx', [route('admin', 'routes/admin.jsx')]),
];
