import TiptapEditor from './PostDescriptionEditorTiptap';

export default function PostDescriptionEditor({ initialValue, onChange }) {
	return <TiptapEditor initialValue={initialValue} onChange={onChange} />;
}
