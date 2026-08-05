import { redirect } from 'react-router';
import AdminMediaPage from '../pages/AdminMediaPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	const permissions = context.get(principalContext).permissions;
	if (!permissions.some((permission) => ['posts.create', 'posts.edit_own', 'posts.edit_all', 'settings.manage'].includes(permission)))
		throw redirect('/admin');
	return null;
}
export default AdminMediaPage;
