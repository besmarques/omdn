import { getPostTypeEditorDefinition } from './postTypeEditorRegistry';

const placements = new Set(['main', 'sidebar']);

export default function PostTypeEditorFields({
	componentProps = {},
	contentType,
	placement,
}) {
	if (!placements.has(placement)) {
		throw new TypeError(
			`Unsupported post editor placement: ${placement}`,
		);
	}

	const definition = getPostTypeEditorDefinition(contentType);

	const Fields =
		placement === 'main'
			? definition.MainFields
			: definition.SidebarFields;

	if (!Fields) {
		return null;
	}

	return <Fields {...componentProps} />;
}
