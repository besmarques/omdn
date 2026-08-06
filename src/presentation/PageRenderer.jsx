import { createElement } from 'react';

import { presentationRegistry } from './presentationRegistry';

function selectComponent(group, key) {
	const Component = presentationRegistry[group][key];

	if (!Component) {
		throw new Error(`Unknown page presentation ${group}: ${key}`);
	}

	return Component;
}

function renderBlocks(blocks, content) {
	return blocks.map((block) => {
		const Block = selectComponent('blocks', block.type);

		return createElement(Block, {
			key: block.id,
			content,
			settings: block.settings ?? {},
		});
	});
}

export default function PageRenderer({ page }) {
	const Layout = selectComponent('layouts', page.presentation.layout);
	const Template = selectComponent('templates', page.presentation.template);
	const Header = selectComponent('headers', page.presentation.header.type);
	const Footer = selectComponent('footers', page.presentation.footer.type);

	return createElement(
		Layout,
		{
			footer: createElement(Footer, {
				content: page.content,
				settings: page.presentation.footer.settings ?? {},
			}),
			header: createElement(Header, {
				content: page.content,
				settings: page.presentation.header.settings ?? {},
			}),
			sidebar: renderBlocks(page.presentation.sidebar ?? [], page.content),
		},
		createElement(Template, {
			content: page.content,
			includeStructuredData: page.structuredData !== false,
			media: page.media,
		}),
	);
}
