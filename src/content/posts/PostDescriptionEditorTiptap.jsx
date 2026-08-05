import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const toolbarActions = [
	{ label: 'Bold', active: 'bold', run: (editor) => editor.chain().focus().toggleBold().run() },
	{ label: 'Italic', active: 'italic', run: (editor) => editor.chain().focus().toggleItalic().run() },
	{ label: 'Bulleted list', active: 'bulletList', run: (editor) => editor.chain().focus().toggleBulletList().run() },
	{ label: 'Numbered list', active: 'orderedList', run: (editor) => editor.chain().focus().toggleOrderedList().run() },
];

function setLink(editor) {
	const previousUrl = editor.getAttributes('link').href ?? '';
	const url = window.prompt('Link URL', previousUrl);

	if (url === null) return;
	if (url.trim() === '') {
		editor.chain().focus().extendMarkRange('link').unsetLink().run();
		return;
	}

	editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
}

export default function PostDescriptionEditorTiptap({ initialValue, onChange }) {
	const editor = useEditor({
		content: initialValue,
		editorProps: {
			attributes: {
				'aria-label': 'Description',
				class:
					'prose min-h-52 max-w-none rounded-b-lg border border-t-0 border-input bg-background px-3 py-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
				role: 'textbox',
			},
		},
		extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false })],
		immediatelyRender: false,
		onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
	});

	return (
		<div className="post-description-editor">
			<div
				aria-label="Description formatting"
				className="flex flex-wrap gap-1 rounded-t-lg border border-input bg-muted p-1"
				role="toolbar"
			>
				{toolbarActions.map((action) => (
					<button
						aria-pressed={editor?.isActive(action.active) ?? false}
						className="rounded px-2 py-1 text-sm hover:bg-background aria-pressed:bg-background aria-pressed:font-semibold"
						disabled={!editor}
						key={action.label}
						type="button"
						onClick={() => action.run(editor)}
					>
						{action.label}
					</button>
				))}
				<button
					aria-pressed={editor?.isActive('link') ?? false}
					className="rounded px-2 py-1 text-sm hover:bg-background aria-pressed:bg-background aria-pressed:font-semibold"
					disabled={!editor}
					type="button"
					onClick={() => setLink(editor)}
				>
					Link
				</button>
				<button
					className="rounded px-2 py-1 text-sm hover:bg-background disabled:opacity-50"
					disabled={!editor?.can().undo()}
					type="button"
					onClick={() => editor.chain().focus().undo().run()}
				>
					Undo
				</button>
				<button
					className="rounded px-2 py-1 text-sm hover:bg-background disabled:opacity-50"
					disabled={!editor?.can().redo()}
					type="button"
					onClick={() => editor.chain().focus().redo().run()}
				>
					Redo
				</button>
			</div>
			{editor ? (
				<EditorContent editor={editor} />
			) : (
				<div aria-hidden="true" className="min-h-52 rounded-b-lg border border-t-0 border-input bg-background px-3 py-2" />
			)}
		</div>
	);
}
