import { redirect } from 'react-router';
import AdminMediaSettingsPage from '../pages/AdminMediaSettingsPage';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	if (!context.get(principalContext).permissions.includes('settings.manage')) throw redirect('/admin');
	return null;
}
export default AdminMediaSettingsPage;
