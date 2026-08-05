import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import FormFeedback from './FormFeedback';

describe('form feedback', () => {
	it('renders a status message and flattened field errors', () => {
		const html = renderToStaticMarkup(
			<FormFeedback message="Unable to save" errors={{ title: ['Title is required'], slug: ['Slug is invalid'] }} />,
		);

		expect(html).toContain('role="alert"');
		expect(html).toContain('Unable to save');
		expect(html).toContain('Title is required');
		expect(html).toContain('Slug is invalid');
	});
});
