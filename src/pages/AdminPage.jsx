import { useCurrentAccount } from '@/query/currentAccountQuery';

export default function AdminPage() {
	const { data: account } = useCurrentAccount();

	return (
		<main className="p-6">
			<h1 className="text-4xl font-bold">Dashboard</h1>
			<p>Welcome, {account.user.displayName || account.user.email}.</p>
			<p>Your available tools are based on your account permissions.</p>
		</main>
	);
}
