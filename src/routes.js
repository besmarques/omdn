import { index, layout, route } from '@react-router/dev/routes';

const developmentRoutes =
	process.env.NODE_ENV === 'production'
		? []
		: [
				route('dev/design-system', 'routes/design-system.jsx'),
				route('dev/page-examples/:example?', 'routes/page-presentation-examples.jsx'),
				route('dev/recipe-editor', 'routes/recipe-editor-proof.jsx'),
			];

export default [
	layout('routes/public-layout.jsx', [
		index('routes/home.jsx'),
		route('articles', 'routes/articles.jsx'),
		route('articles/:slug', 'routes/article.jsx'),
		route('recipes', 'routes/recipes.jsx'),
		route('recipes/:slug', 'routes/recipe.jsx'),
		...developmentRoutes,
		route('*', 'routes/not-found.jsx'),
	]),
	layout('routes/auth-layout.jsx', [
		route('login', 'routes/login.jsx'),
		route('register', 'routes/register.jsx'),
		route('verify-email', 'routes/verify-email.jsx'),
	]),
	layout('routes/private-layout.jsx', [
		route('account/security', 'routes/account-security.jsx'),
		route('admin', 'routes/admin.jsx'),
		route('admin/recipes/new', 'routes/admin-recipe-new.jsx'),
		route('admin/articles/new', 'routes/admin-article-new.jsx'),
	]),
];
