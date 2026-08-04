import { Editor } from '@tinymce/tinymce-react';
import { useEffect, useState } from 'react';

import 'tinymce/skins/ui/oxide/skin.css';

async function loadTinyMce() {
	await import('tinymce/tinymce');
	await Promise.all([
		import('tinymce/icons/default'),
		import('tinymce/models/dom'),
		import('tinymce/plugins/link'),
		import('tinymce/plugins/lists'),
		import('tinymce/themes/silver'),
	]);
}

export default function RecipeDescriptionEditor({ initialValue, onChange }) {
	const [ready, setReady] = useState(false);
	const [loadError, setLoadError] = useState('');

	useEffect(() => {
		let active = true;

		loadTinyMce()
			.then(() => {
				if (active) {
					setReady(true);
				}
			})
			.catch((error) => {
				if (active) {
					setLoadError(error.message || 'Unable to load TinyMCE');
				}
			});

		return () => {
			active = false;
		};
	}, []);

	if (loadError) {
		return <p role="alert">{loadError}</p>;
	}

	if (!ready) {
		return <p>Loading the local recipe description editor...</p>;
	}

	return (
		<Editor
			licenseKey="gpl"
			initialValue={initialValue}
			onEditorChange={onChange}
			init={{
				branding: true,
				content_css: false,
				content_style: 'body { font-family: sans-serif; margin: 1rem; }',
				height: 260,
				menubar: false,
				plugins: ['lists', 'link'],
				skin: false,
				toolbar: 'undo redo | bold italic | bullist numlist | link',
				valid_elements: 'p,strong,em,ul,ol,li,a[href|target|rel],br',
			}}
		/>
	);
}
