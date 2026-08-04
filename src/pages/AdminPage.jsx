import { useCurrentAccount } from '@/query/currentAccountQuery';

export default function AdminPage({ authorized }) {
	const { data: account } = useCurrentAccount();

	return (
		<main>
			<h1>Admin</h1>
			<p>{authorized ? 'You have access to this admin route' : 'Forbidden'}</p>
			{authorized && account.authenticated && <p>Signed in as {account.user.email}</p>}
		</main>
	);
}
