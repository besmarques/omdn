import { useState } from 'react';
import { useAdminContentType, useCreateCategory, useCreateTag } from '../query/adminContentTypeQuery';

export default function AdminTaxonomyPage({ contentType, pluralLabel, taxonomy }) {
	const { data, error, isPending } = useAdminContentType(contentType);
	const categoryMutation = useCreateCategory(contentType);
	const tagMutation = useCreateTag(contentType);
	const [message, setMessage] = useState('');
	const categories = taxonomy === 'categories';
	const mutation = categories ? categoryMutation : tagMutation;

	async function submit(event) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const payload = categories
			? { description: form.get('description'), name: form.get('name'), slug: form.get('slug') }
			: { name: form.get('name') };
		const result = await mutation.mutateAsync(payload);
		setMessage(result.body?.message ?? (result.ok ? `${categories ? 'Category' : 'Tag'} created` : 'Unable to save'));
		if (result.ok) formElement.reset();
	}

	if (isPending)
		return (
			<main className="p-6">
				<h1>Loading…</h1>
			</main>
		);
	if (error)
		return (
			<main className="p-6">
				<p role="alert">{error.message}</p>
			</main>
		);
	const items = categories ? data.categories : data.tags;
	return (
		<main className="grid gap-6 p-6">
			<h1 className="text-4xl font-bold">
				{pluralLabel} {categories ? 'categories' : 'tags'}
			</h1>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						{categories && <th>Slug</th>}
						<th>Posts</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.id}>
							<td>{item.name}</td>
							{categories && <td>{item.slug}</td>}
							<td>{item.post_count}</td>
						</tr>
					))}
					{items.length === 0 && (
						<tr>
							<td colSpan={categories ? 3 : 2}>No {taxonomy} yet.</td>
						</tr>
					)}
				</tbody>
			</table>
			<form className="grid max-w-xl gap-2" onSubmit={submit}>
				<h2 className="text-2xl font-semibold">Add {categories ? 'category' : 'tag'}</h2>
				<label>
					Name
					<input name="name" required maxLength="120" />
				</label>
				{categories && (
					<>
						<label>
							Slug
							<input name="slug" required maxLength="200" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
						</label>
						<label>
							Description
							<textarea name="description" maxLength="2000" />
						</label>
					</>
				)}
				<button disabled={mutation.isPending} type="submit">
					Create {categories ? 'category' : 'tag'}
				</button>
			</form>
			{message && <p>{message}</p>}
		</main>
	);
}
