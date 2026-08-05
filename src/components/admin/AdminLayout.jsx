import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate } from 'react-router';

import { logout } from '../../api/authApi';
import { currentAccountQueryKey, unauthenticatedAccount } from '../../query/currentAccountQuery';

function hasAnyPermission(account, permissions) {
	return permissions.some((permission) => account.permissions.includes(permission));
}

export default function AdminLayout({ account }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [message, setMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const canCreatePosts = account.permissions.includes('posts.create');
	const canManagePosts = hasAnyPermission(account, ['posts.edit_own', 'posts.edit_all', 'posts.review_all']);

	async function handleLogout() {
		setMessage('');
		setSubmitting(true);
		try {
			const result = await logout();
			if (!result.ok) {
				setMessage(result.body?.message ?? 'Logout failed');
				return;
			}
			queryClient.removeQueries({ predicate: (query) => query.meta?.private === true });
			queryClient.setQueryData(currentAccountQueryKey, unauthenticatedAccount);
			navigate('/login', { replace: true });
		} catch (error) {
			setMessage(error.message || 'Unable to contact the server');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen bg-muted/30">
			<header className="flex items-center justify-between border-b bg-background px-6 py-3">
				<Link className="font-semibold" to="/admin">
					O Melhor do Natal
				</Link>
				<div className="flex items-center gap-4">
					<Link to="/">View website</Link>
					<span>{account.user.displayName || account.user.email}</span>
					<button disabled={submitting} type="button" onClick={handleLogout}>
						{submitting ? 'Logging out…' : 'Logout'}
					</button>
				</div>
			</header>
			<div className="grid min-h-[calc(100vh-3.5rem)] md:grid-cols-[15rem_1fr]">
				<aside className="border-r bg-background p-4">
					<nav aria-label="Dashboard navigation" className="grid gap-2">
						<Link to="/admin">Dashboard</Link>
						{canManagePosts && (
							<section>
								<h2 className="font-semibold">Content</h2>
								<div className="ml-3 mt-2 grid gap-3">
									<section>
										<h3 className="font-medium">Recipes</h3>
										<div className="ml-3 grid gap-1">
											<Link to="/admin/recipes">All recipes</Link>
											{canCreatePosts && (
												<Link reloadDocument to="/admin/recipes/new">
													Add recipe
												</Link>
											)}
											{account.permissions.includes('posts.edit_all') && (
												<>
													<Link to="/admin/recipe/categories">Recipe categories</Link>
													<Link to="/admin/recipe/tags">Recipe tags</Link>
												</>
											)}
										</div>
									</section>
									<section>
										<h3 className="font-medium">Articles</h3>
										<div className="ml-3 grid gap-1">
											<Link to="/admin/articles">All articles</Link>
											{canCreatePosts && (
												<Link reloadDocument to="/admin/articles/new">
													Add article
												</Link>
											)}
											{account.permissions.includes('posts.edit_all') && (
												<>
													<Link to="/admin/article/categories">Article categories</Link>
													<Link to="/admin/article/tags">Article tags</Link>
												</>
											)}
										</div>
									</section>
								</div>
							</section>
						)}
						{account.permissions.includes('users.manage') && <Link to="/admin/users">Users</Link>}
						{account.permissions.includes('roles.manage') && <Link to="/admin/roles">Roles</Link>}
						{account.permissions.includes('settings.manage') && <Link to="/admin/settings">Settings</Link>}
						<Link to="/admin/security">Account security</Link>
					</nav>
				</aside>
				<div className="min-w-0">
					<Outlet />
				</div>
			</div>
			{message && <p role="alert">{message}</p>}
		</div>
	);
}
