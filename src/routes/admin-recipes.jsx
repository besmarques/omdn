import { redirect } from 'react-router';
import AdminContentTypePage from '../pages/AdminContentTypePage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	const permissions = context.get(principalContext).permissions;
	if (!permissions.some((permission) => ['posts.edit_own', 'posts.edit_all', 'posts.review_all'].includes(permission)))
		throw redirect('/admin');
	return null;
}
export default function AdminRecipesRoute() {
	return <AdminContentTypePage contentType="recipe" createPath="/admin/recipes/new" pluralLabel="Recipes" />;
}
