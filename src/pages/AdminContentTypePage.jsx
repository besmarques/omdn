import { Link } from 'react-router';
import { useAdminContentType, useUpdateArchiveSeo } from '../query/adminContentTypeQuery';
import { useCurrentAccount } from '../query/currentAccountQuery';

export default function AdminContentTypePage({ contentType, createPath, pluralLabel }) {
	const { data, error, isPending } = useAdminContentType(contentType);
	const { data: account } = useCurrentAccount();
	const seoMutation = useUpdateArchiveSeo(contentType);
	const canManageArchive = account.permissions.some((permission) => ['posts.edit_all', 'posts.review_all'].includes(permission));
	if (isPending)
		return (
			<main className="p-6">
				<h1>{pluralLabel}</h1>
				<p>Loading…</p>
			</main>
		);
	if (error)
		return (
			<main className="p-6">
				<h1>{pluralLabel}</h1>
				<p role="alert">{error.message}</p>
			</main>
		);
	async function saveSeo(event) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		await seoMutation.mutateAsync({ description: form.get('description'), title: form.get('title') });
	}
	return (
		<main className="grid gap-8 p-6">
			<header>
				<h1 className="text-4xl font-bold">{pluralLabel}</h1>
				<Link reloadDocument to={createPath}>
					Add new
				</Link>
			</header>
			<table>
				<thead>
					<tr>
						<th>Title</th>
						<th>Author</th>
						<th>Status</th>
						<th>Updated</th>
					</tr>
				</thead>
				<tbody>
					{data.posts.map((post) => (
						<tr key={post.id}>
							<td>
								<Link to={`/admin/${contentType}s/${post.id}/edit`}>{post.title}</Link>
							</td>
							<td>{post.author}</td>
							<td>{post.status}</td>
							<td>
								{new Date(post.updated_at).toLocaleDateString()} <Link to={`/admin/${contentType}s/${post.id}/edit`}>Edit</Link>
							</td>
						</tr>
					))}
					{data.posts.length === 0 && (
						<tr>
							<td colSpan="4">No {pluralLabel.toLowerCase()} yet.</td>
						</tr>
					)}
				</tbody>
			</table>
			{canManageArchive && (
				<section>
					<h2 className="text-2xl font-semibold">Archive SEO</h2>
					<form className="grid max-w-2xl gap-3" onSubmit={saveSeo}>
						<label htmlFor={`${contentType}-archive-title`}>SEO title</label>
						<input id={`${contentType}-archive-title`} name="title" maxLength="255" defaultValue={data.archiveSeo.title ?? ''} />
						<label htmlFor={`${contentType}-archive-description`}>Meta description</label>
						<textarea
							id={`${contentType}-archive-description`}
							name="description"
							maxLength="320"
							defaultValue={data.archiveSeo.description ?? ''}
						/>
						<button type="submit" disabled={seoMutation.isPending}>
							Save archive SEO
						</button>
					</form>
				</section>
			)}
		</main>
	);
}
