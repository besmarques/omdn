import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import { Input } from '../ui/input';
import FormField from './FormField';

describe('form field', () => {
	it('associates its label, description, and validation feedback with a control', () => {
		const html = renderToStaticMarkup(
			<FormField label="Email" name="email" description="Used for account messages" errors={['Email is invalid']}>
				<Input id="email" name="email" type="email" />
			</FormField>,
		);

		expect(html).toContain('for="email"');
		expect(html).toContain('Used for account messages');
		expect(html).toContain('Email is invalid');
		expect(html).toContain('data-invalid="true"');
	});
});
