import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import PostTypeEditorFields from './PostTypeEditorFields';
import {
	getPostTypeEditorDefinition,
	supportsPostTypeEditor,
} from './postTypeEditorRegistry';

describe('post-type editor fields', () => {
	it('registers supported post types', () => {
		expect(supportsPostTypeEditor('article')).toBe(true);
		expect(supportsPostTypeEditor('recipe')).toBe(true);
		expect(supportsPostTypeEditor('travel')).toBe(false);
	});

	it('renders recipe fields in the main editor slot', () => {
		const html = renderToStaticMarkup(
			<PostTypeEditorFields
				contentType="recipe"
				placement="main"
				componentProps={{
					ingredients: '',
					instructions: '',
					onIngredientsChange: () => {},
					onInstructionsChange: () => {},
					values: {},
				}}
			/>,
		);

		expect(html).toContain('Recipe');
		expect(html).toContain('name="ingredients"');
		expect(html).toContain('name="instructions"');
	});

	it('renders nothing when a post type has no fields for a slot', () => {
		const articleMain = renderToStaticMarkup(
			<PostTypeEditorFields
				contentType="article"
				placement="main"
			/>,
		);

		const recipeSidebar = renderToStaticMarkup(
			<PostTypeEditorFields
				contentType="recipe"
				placement="sidebar"
			/>,
		);

		expect(articleMain).toBe('');
		expect(recipeSidebar).toBe('');
	});

	it('rejects unsupported post types and placements', () => {
		expect(() =>
			getPostTypeEditorDefinition('travel'),
		).toThrow(
			'Unsupported post editor content type: travel',
		);

		expect(() =>
			renderToStaticMarkup(
				<PostTypeEditorFields
					contentType="article"
					placement="footer"
				/>,
			),
		).toThrow(
			'Unsupported post editor placement: footer',
		);
	});
});
