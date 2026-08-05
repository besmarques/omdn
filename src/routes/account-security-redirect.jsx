import { redirect } from 'react-router';

export function loader() {
	throw redirect('/admin/security', 301);
}
export default function AccountSecurityRedirect() {
	return null;
}
