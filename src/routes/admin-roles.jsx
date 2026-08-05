import { redirect } from 'react-router';
import AdminSectionPage from '../pages/AdminSectionPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	if (!context.get(principalContext).permissions.includes('roles.manage')) throw redirect('/admin');
	return null;
}
export default function AdminRolesRoute() {
	return <AdminSectionPage title="Roles" description="Role and permission management will be implemented here." />;
}
