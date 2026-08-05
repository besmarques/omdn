import { redirect, useParams } from 'react-router';
import AdminPostEditPage from '../pages/AdminPostEditPage';
import { principalContext } from '#framework/contexts';

const types = Object.freeze({ articles: 'article', recipes: 'recipe' });
export function loader({ context, params }) {
	if (!Object.hasOwn(types, params.contentType) || !/^[1-9][0-9]*$/u.test(params.id)) throw redirect('/admin');
	const permissions = context.get(principalContext).permissions;
	if (!permissions.some((permission) => ['posts.edit_own', 'posts.edit_all'].includes(permission))) throw redirect('/admin');
	return null;
}
export default function AdminPostEditRoute() {
	const params = useParams();
	return <AdminPostEditPage contentType={types[params.contentType]} id={Number(params.id)} />;
}
