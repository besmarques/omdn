import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import PostEditorFields from './PostEditorFields';

describe('shared post editor fields', () => {
	it('renders post identity, summary, media boundary, and publication controls', () => {
		const html = renderToStaticMarkup(
			<PostEditorFields
				canPublish
				description="Description"
				descriptionHtml="<p>Description</p>"
				excerpt="Excerpt"
				onDescriptionHtmlChange={vi.fn()}
				onExcerptChange={vi.fn()}
				onPublicationChange={vi.fn()}
				onSlugChange={vi.fn()}
				onTitleChange={vi.fn()}
				publication="schedule"
				slug="post-slug"
				title="Post title"
			/>,
		);

		expect(html).toContain('name="title"');
		expect(html).toContain('name="slug"');
		expect(html).toContain('name="description"');
		expect(html).toContain('name="excerpt"');
		expect(html).toContain('Featured image');
		expect(html).toContain('name="publication"');
		expect(html).toContain('name="publishAt"');
	});
});
