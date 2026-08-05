import sanitizeHtml from 'sanitize-html';

const options = Object.freeze({
	allowedAttributes: { a: ['href', 'rel', 'target'] },
	allowedSchemes: ['http', 'https', 'mailto'],
	allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
	transformTags: {
		a: (tagName, attributes) => {
			const transformedAttributes = { ...attributes, rel: 'noopener noreferrer' };

			if (attributes.target !== '_blank') delete transformedAttributes.target;
			return { attribs: transformedAttributes, tagName };
		},
	},
});

export function sanitizePostDescriptionHtml(value) {
	return sanitizeHtml(value, options);
}

export function derivePostDescriptionText(value) {
	return sanitizeHtml(sanitizePostDescriptionHtml(value), { allowedAttributes: {}, allowedTags: [] }).replace(/\s+/gu, ' ').trim();
}
