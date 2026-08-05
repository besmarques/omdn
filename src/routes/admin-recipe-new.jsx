import { data } from 'react-router';

import AdminRecipeCreatePage from '../pages/AdminRecipeCreatePage';

import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	const principal = context.get(principalContext);

	if (!principal.permissions.includes('posts.create')) {
		throw data('Forbidden', { status: 403 });
	}

	return {
		canPublish: principal.permissions.some((permission) => ['posts.publish_own', 'posts.publish_all'].includes(permission)),
	};
}

export default function AdminRecipeNewRoute({ loaderData }) {
	return <AdminRecipeCreatePage canPublish={loaderData.canPublish} />;
}
