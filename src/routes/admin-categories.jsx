import { redirect } from 'react-router';
import AdminCategoriesPage from '../pages/AdminCategoriesPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	if (!context.get(principalContext).permissions.includes('posts.edit_all')) throw redirect('/admin');
	return null;
}
export default function AdminCategoriesRoute() {
	return <AdminCategoriesPage />;
}
