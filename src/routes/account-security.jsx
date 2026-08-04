import AccountSecurityPage from '@/pages/AccountSecurityPage';

import { principalContext } from '#framework/contexts';

export function loader({ context }) {
	return { principal: context.get(principalContext) };
}

export default function AccountSecurityRoute({ loaderData }) {
	return <AccountSecurityPage principal={loaderData.principal} />;
}
