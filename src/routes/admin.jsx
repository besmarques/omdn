import AdminPage from '@/pages/AdminPage';

import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	const principal = context.get(principalContext);

	return {
		authorized: principal.permissions.includes('users.manage'),
		principal,
	};
}

export default function AdminRoute({ loaderData }) {
	return <AdminPage authorized={loaderData.authorized} principal={loaderData.principal} />;
}
