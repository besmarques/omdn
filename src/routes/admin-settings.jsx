import { redirect } from 'react-router';
import { Link } from 'react-router';
import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	if (!context.get(principalContext).permissions.includes('settings.manage')) throw redirect('/admin');
	return null;
}
export default function AdminSettingsRoute() {
	return (
		<main className="grid gap-4 p-6">
			<h1 className="text-4xl font-bold">Settings</h1>
			<Link to="/admin/settings/media">Media settings</Link>
		</main>
	);
}
