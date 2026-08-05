import { Link } from 'react-router';
import { useState } from 'react';
import { useAdminContentType, useTransitionAdminPost, useUpdateArchiveSeo } from '../query/adminContentTypeQuery';
import { useCurrentAccount } from '../query/currentAccountQuery';

function canActOnPost(account, post, capability) {
	return (
		account.permissions.includes(`posts.${capability}_all`) ||
		(account.permissions.includes(`posts.${capability}_own`) && Number(account.user.id) === Number(post.owner_user_id))
	);
}

function PostActions({ account, contentType, post }) {
	const mutation = useTransitionAdminPost(contentType);
	const [publishAt, setPublishAt] = useState('');
	const [message, setMessage] = useState('');
	const canPublish = canActOnPost(account, post, 'publish');
	const canDelete = canActOnPost(account, post, 'delete');
	async function act(action) {
		if (action === 'trash' && !globalThis.confirm(`Move ${post.title} to trash?`)) return;
		const input = {
			expectedLockVersion: post.lock_version,
			...(action === 'schedule' && publishAt ? { publishAt: new Date(publishAt).toISOString() } : {}),
		};
		const result = await mutation.mutateAsync({ action, id: post.id, input });
		setMessage(result.body?.message ?? (result.ok ? 'Post updated' : 'Unable to update post'));
	}
	return (
		<div className="grid gap-1">
			<div className="flex flex-wrap gap-2">
				{canPublish && ['draft', 'in_review', 'scheduled', 'archived'].includes(post.status) && (
					<button disabled={mutation.isPending} type="button" onClick={() => act('publish')}>
						Publish
					</button>
				)}
				{canPublish && post.status === 'published' && (
					<button disabled={mutation.isPending} type="button" onClick={() => act('unpublish')}>
						Unpublish
					</button>
				)}
				{canDelete && post.status !== 'trashed' && (
					<button disabled={mutation.isPending} type="button" onClick={() => act('trash')}>
						Trash
					</button>
				)}
				{canDelete && post.status === 'trashed' && (
					<button disabled={mutation.isPending} type="button" onClick={() => act('restore')}>
						Restore
					</button>
				)}
			</div>
			{canPublish && ['draft', 'in_review', 'scheduled', 'archived'].includes(post.status) && (
				<label>
					Schedule
					<input
						aria-label={`Schedule ${post.title}`}
						type="datetime-local"
						value={publishAt}
						onChange={(event) => setPublishAt(event.target.value)}
					/>
					<button disabled={mutation.isPending || !publishAt} type="button" onClick={() => act('schedule')}>
						Set schedule
					</button>
				</label>
			)}
			{message && <span role="status">{message}</span>}
		</div>
	);
}

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
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{data.posts.map((post) => (
						<tr key={post.id}>
							<td>{post.status === 'trashed' ? post.title : <Link to={`/admin/${contentType}s/${post.id}/edit`}>{post.title}</Link>}</td>
							<td>{post.author}</td>
							<td>{post.status}</td>
							<td>
								{new Date(post.updated_at).toLocaleDateString()}{' '}
								{post.status !== 'trashed' && <Link to={`/admin/${contentType}s/${post.id}/edit`}>Edit</Link>}
							</td>
							<td>
								<PostActions account={account} contentType={contentType} post={post} />
							</td>
						</tr>
					))}
					{data.posts.length === 0 && (
						<tr>
							<td colSpan="5">No {pluralLabel.toLowerCase()} yet.</td>
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
