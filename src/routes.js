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
		route('account/security', 'routes/account-security-redirect.jsx'),
		route('admin', 'routes/admin.jsx'),
		route('admin/security', 'routes/account-security.jsx'),
		route('admin/recipes', 'routes/admin-recipes.jsx'),
		route('admin/articles', 'routes/admin-articles.jsx'),
		route('admin/:contentType/:id/edit', 'routes/admin-post-edit.jsx'),
		route('admin/:contentType/:taxonomy', 'routes/admin-taxonomy.jsx'),
		route('admin/users', 'routes/admin-users.jsx'),
		route('admin/roles', 'routes/admin-roles.jsx'),
		route('admin/settings', 'routes/admin-settings.jsx'),
		route('admin/settings/media', 'routes/admin-media-settings.jsx'),
		route('admin/media', 'routes/admin-media.jsx'),
		route('admin/recipes/new', 'routes/admin-recipe-new.jsx'),
		route('admin/articles/new', 'routes/admin-article-new.jsx'),
	]),
];
