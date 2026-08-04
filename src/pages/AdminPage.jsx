export default function AdminPage({ authorized, principal }) {
	return (
		<main>
			<h1>Admin</h1>
			<p>{authorized ? 'You have access to this admin route' : 'Forbidden'}</p>
			{authorized && <p>Signed in as {principal.user.email}</p>}
		</main>
	);
}
