import { useState } from 'react';
import { useMedia, useUploadMedia } from '../query/mediaQuery';

export default function AdminMediaPage() {
	const media = useMedia();
	const upload = useUploadMedia();
	const [message, setMessage] = useState('');
	async function submit(event) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const result = await upload.mutateAsync(form);
		setMessage(result.body?.message ?? (result.ok ? 'Image uploaded and variants generated' : 'Unable to upload image'));
		if (result.ok) formElement.reset();
	}
	if (media.isPending)
		return (
			<main className="p-6">
				<h1>Media Library</h1>
				<p>Loading…</p>
			</main>
		);
	if (media.error)
		return (
			<main className="p-6">
				<h1>Media Library</h1>
				<p role="alert">{media.error.message}</p>
			</main>
		);
	return (
		<main className="grid gap-8 p-6">
			<h1 className="text-4xl font-bold">Media Library</h1>
			<form className="grid max-w-xl gap-3" encType="multipart/form-data" onSubmit={submit}>
				<label>
					Image
					<input accept=".jpg,.jpeg,.png,image/jpeg,image/png" name="image" required type="file" />
				</label>
				<label>
					Default alt text
					<input maxLength="500" name="defaultAltText" />
				</label>
				<button disabled={upload.isPending} type="submit">
					{upload.isPending ? 'Processing…' : 'Upload image'}
				</button>
				{message && <p role="status">{message}</p>}
			</form>
			<section aria-label="Images" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{media.data.map((asset) => (
					<article key={asset.id} className="grid gap-2 border p-3">
						<img
							alt={asset.default_alt_text || ''}
							loading="lazy"
							src={`/api/admin/media/${asset.id}/files/${asset.variants.some(({ name }) => name === 'thumbnail') ? 'thumbnail' : 'original'}`}
						/>
						<strong>{asset.original_filename}</strong>
						<span>
							{asset.width} × {asset.height} · {asset.mime_type}
						</span>
						<span>{asset.variants.length} generated sizes</span>
					</article>
				))}
				{media.data.length === 0 && <p>No images uploaded yet.</p>}
			</section>
		</main>
	);
}
