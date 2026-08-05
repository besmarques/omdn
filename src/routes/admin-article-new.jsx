import { redirect } from 'react-router';
import AdminArticleCreatePage from '../pages/AdminArticleCreatePage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	const principal = context.get(principalContext);
	if (!principal.permissions.includes('posts.create')) throw redirect('/admin');
	return { canPublish: principal.permissions.some((permission) => ['posts.publish_own', 'posts.publish_all'].includes(permission)) };
}
export default function AdminArticleNewRoute({ loaderData }) {
	return <AdminArticleCreatePage canPublish={loaderData.canPublish} />;
}
