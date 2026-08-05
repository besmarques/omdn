import { useState } from 'react';
import { useMediaSettings, useUpdateMediaSettings } from '../query/mediaQuery';

function SettingsForm({ initial }) {
	const mutation = useUpdateMediaSettings();
	const [sizes, setSizes] = useState(initial.imageSizes);
	const [message, setMessage] = useState('');
	async function submit(event) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const result = await mutation.mutateAsync({
			acceptedMimeTypes: form.getAll('acceptedMimeTypes'),
			imageSizes: sizes,
			maxSourceHeight: Number(form.get('maxSourceHeight')),
			maxSourcePixels: Number(form.get('maxSourcePixels')),
			maxSourceWidth: Number(form.get('maxSourceWidth')),
			maxUploadBytes: Number(form.get('maxUploadMegabytes')) * 1024 * 1024,
		});
		setMessage(result.body?.message ?? (result.ok ? 'Media settings saved' : 'Unable to save settings'));
	}
	function updateSize(index, field, value) {
		setSizes((current) =>
			current.map((size, itemIndex) =>
				itemIndex === index ? { ...size, [field]: ['width', 'height'].includes(field) ? Number(value) : value } : size,
			),
		);
	}
	return (
		<form className="grid max-w-3xl gap-5" onSubmit={submit}>
			<fieldset>
				<legend>Accepted upload formats</legend>
				{initial.supportedImageTypes.map((type) => (
					<label key={type.mimeType}>
						<input
							defaultChecked={initial.acceptedMimeTypes.includes(type.mimeType)}
							name="acceptedMimeTypes"
							type="checkbox"
							value={type.mimeType}
						/>{' '}
						{type.label} (.{type.extension})
					</label>
				))}
			</fieldset>
			<label>
				Maximum upload size (MB)
				<input defaultValue={initial.maxUploadBytes / 1024 / 1024} min="1" max="50" name="maxUploadMegabytes" required type="number" />
			</label>
			<label>
				Maximum source width
				<input defaultValue={initial.maxSourceWidth} min="16" max="30000" name="maxSourceWidth" required type="number" />
			</label>
			<label>
				Maximum source height
				<input defaultValue={initial.maxSourceHeight} min="16" max="30000" name="maxSourceHeight" required type="number" />
			</label>
			<label>
				Maximum source pixels
				<input defaultValue={initial.maxSourcePixels} min="256" max="100000000" name="maxSourcePixels" required type="number" />
			</label>
			<fieldset className="grid gap-3">
				<legend>Generated image sizes</legend>
				{sizes.map((size, index) => (
					<div className="flex flex-wrap gap-2" key={`${size.name}-${index}`}>
						<label>
							Name
							<input required value={size.name} onChange={(event) => updateSize(index, 'name', event.target.value)} />
						</label>
						<label>
							Width
							<input
								min="16"
								max="8000"
								required
								type="number"
								value={size.width}
								onChange={(event) => updateSize(index, 'width', event.target.value)}
							/>
						</label>
						<label>
							Height
							<input
								min="16"
								max="8000"
								required
								type="number"
								value={size.height}
								onChange={(event) => updateSize(index, 'height', event.target.value)}
							/>
						</label>
						<label>
							Fit
							<select value={size.fit} onChange={(event) => updateSize(index, 'fit', event.target.value)}>
								<option value="inside">Fit inside</option>
								<option value="cover">Crop to cover</option>
							</select>
						</label>
						<button
							disabled={sizes.length === 1}
							type="button"
							onClick={() => setSizes((current) => current.filter((_, itemIndex) => itemIndex !== index))}
						>
							Remove
						</button>
					</div>
				))}
			</fieldset>
			<button
				type="button"
				disabled={sizes.length >= 12}
				onClick={() =>
					setSizes((current) => [...current, { fit: 'inside', height: 1200, name: `size-${current.length + 1}`, width: 1200 }])
				}
			>
				Add image size
			</button>
			<button disabled={mutation.isPending} type="submit">
				Save media settings
			</button>
			{message && <p role="status">{message}</p>}
		</form>
	);
}

export default function AdminMediaSettingsPage() {
	const settings = useMediaSettings();
	if (settings.isPending)
		return (
			<main className="p-6">
				<h1>Media Settings</h1>
				<p>Loading…</p>
			</main>
		);
	if (settings.error)
		return (
			<main className="p-6">
				<h1>Media Settings</h1>
				<p role="alert">{settings.error.message}</p>
			</main>
		);
	return (
		<main className="grid gap-6 p-6">
			<h1 className="text-4xl font-bold">Media Settings</h1>
			<p>Changes apply to new uploads. Existing immutable variants are not rewritten automatically.</p>
			<SettingsForm initial={settings.data} />
		</main>
	);
}
