export const supportedImageTypes = Object.freeze([
	Object.freeze({ extension: 'jpg', label: 'JPEG', mimeType: 'image/jpeg' }),
	Object.freeze({ extension: 'png', label: 'PNG', mimeType: 'image/png' }),
]);

export const supportedImageMimeTypes = Object.freeze(supportedImageTypes.map(({ mimeType }) => mimeType));
