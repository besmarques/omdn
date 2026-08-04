import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { ErrorDocument } from './root';

describe('root error document', () => {
	it('renders an unexpected failure without exposing error details', () => {
		const html = renderToStaticMarkup(<ErrorDocument notFound={false} />);

		expect(html).toContain('<h1>Something went wrong</h1>');
		expect(html).toContain('Please try again later.');
		expect(html).not.toContain('stack');
		expect(html).not.toContain('database');
	});
});
