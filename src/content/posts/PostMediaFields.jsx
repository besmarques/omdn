import { useState } from 'react';
import { useMedia, useUploadMedia } from '../../query/mediaQuery';

export default function PostMediaFields({ onChange, value }) {
	const media = useMedia();
	const upload = useUploadMedia();
	const [message, setMessage] = useState('');
	const [uploadFile, setUploadFile] = useState(null);
	const [uploadAlt, setUploadAlt] = useState('');
	async function submitUpload() {
		if (!uploadFile) return;
		const form = new FormData();
		form.set('image', uploadFile);
		form.set('defaultAltText', uploadAlt);
		const result = await upload.mutateAsync(form);
		setMessage(result.body?.message ?? (result.ok ? 'Image added to the library' : 'Unable to upload image'));
		if (result.ok) {
			setUploadFile(null);
			setUploadAlt('');
		}
	}
	function usage(asset) {
		return { altText: asset.default_alt_text ?? '', id: asset.id };
	}
	function setFeatured(asset) {
		onChange({ ...value, featured: value.featured?.id === asset.id ? null : usage(asset) });
	}
	function toggleGallery(asset) {
		const included = value.gallery.some(({ id }) => id === asset.id);
		onChange({ ...value, gallery: included ? value.gallery.filter(({ id }) => id !== asset.id) : [...value.gallery, usage(asset)] });
	}
	function updateAlt(role, id, altText) {
		onChange(
			role === 'featured'
				? { ...value, featured: { ...value.featured, altText } }
				: { ...value, gallery: value.gallery.map((item) => (item.id === id ? { ...item, altText } : item)) },
		);
	}
	function move(id, offset) {
		const gallery = [...value.gallery];
		const index = gallery.findIndex((item) => item.id === id);
		const target = index + offset;
		if (target < 0 || target >= gallery.length) return;
		[gallery[index], gallery[target]] = [gallery[target], gallery[index]];
		onChange({ ...value, gallery });
	}
	if (media.isPending)
		return (
			<section>
				<h2>Post images</h2>
				<p>Loading media…</p>
			</section>
		);
	if (media.error)
		return (
			<section>
				<h2>Post images</h2>
				<p role="alert">{media.error.message}</p>
			</section>
		);
	return (
		<section className="grid gap-4" aria-labelledby="post-images-heading">
			<h2 className="text-2xl font-semibold" id="post-images-heading">
				Post images
			</h2>
			<div className="flex flex-wrap items-end gap-2">
				<label>
					Upload JPEG or PNG
					<input
						accept=".jpg,.jpeg,.png,image/jpeg,image/png"
						type="file"
						onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
					/>
				</label>
				<label>
					Default alt text
					<input maxLength="500" value={uploadAlt} onChange={(event) => setUploadAlt(event.target.value)} />
				</label>
				<button disabled={upload.isPending || !uploadFile} type="button" onClick={submitUpload}>
					Upload to library
				</button>
			</div>
			{message && <p role="status">{message}</p>}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{media.data.map((asset) => {
					const featured = value.featured?.id === asset.id;
					const galleryIndex = value.gallery.findIndex(({ id }) => id === asset.id);
					const thumbnail = asset.variants.some(({ name }) => name === 'thumbnail') ? 'thumbnail' : 'original';
					return (
						<article className="grid gap-2 border p-2" key={asset.id}>
							<img alt="" src={`/api/admin/media/${asset.id}/files/${thumbnail}`} />
							<span>{asset.original_filename}</span>
							<button type="button" aria-pressed={featured} onClick={() => setFeatured(asset)}>
								{featured ? 'Remove featured' : 'Use as featured'}
							</button>
							<label>
								<input checked={galleryIndex >= 0} type="checkbox" onChange={() => toggleGallery(asset)} /> Include in gallery
							</label>
							{featured && (
								<label>
									Featured alt text
									<input
										maxLength="500"
										value={value.featured.altText}
										onChange={(event) => updateAlt('featured', asset.id, event.target.value)}
									/>
								</label>
							)}
							{galleryIndex >= 0 && (
								<>
									<label>
										Gallery alt text
										<input
											maxLength="500"
											value={value.gallery[galleryIndex].altText}
											onChange={(event) => updateAlt('gallery', asset.id, event.target.value)}
										/>
									</label>
									<div>
										<button disabled={galleryIndex === 0} type="button" onClick={() => move(asset.id, -1)}>
											Move earlier
										</button>
										<button disabled={galleryIndex === value.gallery.length - 1} type="button" onClick={() => move(asset.id, 1)}>
											Move later
										</button>
									</div>
								</>
							)}
						</article>
					);
				})}
			</div>
			{media.data.length === 0 && <p>Upload an image to select featured and gallery media.</p>}
		</section>
	);
}
