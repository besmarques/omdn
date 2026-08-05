import { useCurrentAccount } from '@/query/currentAccountQuery';
import { Link } from 'react-router';

export default function AdminPage({ authorized }) {
	const { data: account } = useCurrentAccount();

	return (
		<main>
			<h1>Admin</h1>
			<p>{authorized ? 'You have access to this admin route' : 'Forbidden'}</p>
			{authorized && account.authenticated && <p>Signed in as {account.user.email}</p>}
			{authorized && (
				<>
					<Link prefetch="render" to="/admin/recipes/new">
						Add recipe
					</Link>{' '}
					<Link prefetch="render" to="/admin/articles/new">
						Add article
					</Link>
				</>
			)}
		</main>
	);
}
