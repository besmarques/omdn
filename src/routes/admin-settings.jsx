import { redirect } from 'react-router';
import AdminSectionPage from '../pages/AdminSectionPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	if (!context.get(principalContext).permissions.includes('settings.manage')) throw redirect('/admin');
	return null;
}
export default function AdminSettingsRoute() {
	return <AdminSectionPage title="Settings" description="Website settings will be implemented here." />;
}
