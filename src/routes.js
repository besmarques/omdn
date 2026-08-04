import { index, route } from '@react-router/dev/routes';

const developmentRoutes =
	process.env.NODE_ENV === 'production'
		? []
		: [
				route('dev/design-system', 'routes/design-system.jsx'),
				route('dev/page-examples/:example?', 'routes/page-presentation-examples.jsx'),
			];

export default [
	index('routes/home.jsx'),
	route('login', 'routes/login.jsx'),
	route('register', 'routes/register.jsx'),
	route('verify-email', 'routes/verify-email.jsx'),
	route('admin', 'routes/admin.jsx'),
	...developmentRoutes,
	route('*', 'routes/not-found.jsx'),
];
