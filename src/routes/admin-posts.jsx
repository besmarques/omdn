import { redirect } from 'react-router';
import AdminSectionPage from '../pages/AdminSectionPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	const permissions = context.get(principalContext).permissions;
	if (!permissions.some((permission) => ['posts.edit_own', 'posts.edit_all', 'posts.review_all'].includes(permission)))
		throw redirect('/admin');
	return null;
}
export default function AdminPostsRoute() {
	return <AdminSectionPage title="Posts" description="Your editable recipes and articles will be listed here." />;
}
