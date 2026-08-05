import { useState } from 'react';
import { useAdminContentType, useCreateCategory } from '../query/adminContentTypeQuery';

function CategorySection({ contentType, label }) {
	const { data, isPending } = useAdminContentType(contentType);
	const mutation = useCreateCategory(contentType);
	const [message, setMessage] = useState('');
	async function submit(event) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const result = await mutation.mutateAsync({ description: form.get('description'), name: form.get('name'), slug: form.get('slug') });
		setMessage(result.body?.message ?? (result.ok ? 'Category created' : 'Unable to create category'));
		if (result.ok) formElement.reset();
	}
	return (
		<section className="grid gap-4">
			<h2 className="text-2xl font-semibold">{label} categories</h2>
			{isPending ? (
				<p>Loading…</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Slug</th>
							<th>Posts</th>
						</tr>
					</thead>
					<tbody>
						{data.categories.map((category) => (
							<tr key={category.id}>
								<td>{category.name}</td>
								<td>{category.slug}</td>
								<td>{category.post_count}</td>
							</tr>
						))}
						{data.categories.length === 0 && (
							<tr>
								<td colSpan="3">No categories yet.</td>
							</tr>
						)}
					</tbody>
				</table>
			)}
			<form className="grid max-w-xl gap-2" onSubmit={submit}>
				<h3 className="text-xl font-semibold">Add category</h3>
				<label>
					Name
					<input name="name" required maxLength="120" />
				</label>
				<label>
					Slug
					<input name="slug" required maxLength="200" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
				</label>
				<label>
					Description
					<textarea name="description" maxLength="2000" />
				</label>
				<button disabled={mutation.isPending} type="submit">
					Create category
				</button>
			</form>
			{message && <p>{message}</p>}
		</section>
	);
}

export default function AdminCategoriesPage() {
	return (
		<main className="grid gap-10 p-6">
			<h1 className="text-4xl font-bold">Categories</h1>
			<CategorySection contentType="recipe" label="Recipe" />
			<CategorySection contentType="article" label="Article" />
		</main>
	);
}
