import { redirect } from 'react-router';
import AdminSectionPage from '../pages/AdminSectionPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	if (!context.get(principalContext).permissions.includes('users.manage')) throw redirect('/admin');
	return null;
}
export default function AdminUsersRoute() {
	return <AdminSectionPage title="Users" description="User management will be implemented here." />;
}
