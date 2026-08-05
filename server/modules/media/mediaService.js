import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';

const formats = Object.freeze({ jpeg: { extension: 'jpg', mimeType: 'image/jpeg' }, png: { extension: 'png', mimeType: 'image/png' } });

export default function createMediaService(repository, storage) {
	async function upload(file, actorId, defaultAltText = '') {
		if (!file) throw new RangeError('Choose an image to upload');
		const settings = await repository.getSettings();
		if (file.size > settings.maxUploadBytes) throw new RangeError('The image exceeds the configured upload limit');
		let metadata;
		try {
			metadata = await sharp(file.buffer, { limitInputPixels: settings.maxSourcePixels }).metadata();
		} catch {
			throw new RangeError('The uploaded file is not a valid JPEG or PNG image');
		}
		const format = formats[metadata.format];
		if (!format || !settings.acceptedMimeTypes.includes(format.mimeType)) throw new RangeError('That image format is not accepted');
		if (!metadata.width || !metadata.height || metadata.width > settings.maxSourceWidth || metadata.height > settings.maxSourceHeight)
			throw new RangeError('The image dimensions exceed the configured limits');

		const uuid = randomUUID();
		const prefix = `${uuid.slice(0, 2)}/${uuid}`;
		const encode = (pipeline) =>
			format.extension === 'jpg' ? pipeline.jpeg({ quality: 88, mozjpeg: true }) : pipeline.png({ compressionLevel: 9 });
		try {
			const original = await encode(sharp(file.buffer, { limitInputPixels: settings.maxSourcePixels }).rotate()).toBuffer({
				resolveWithObject: true,
			});
			const storageKey = `${prefix}/original.${format.extension}`;
			await storage.write(storageKey, original.data);
			const variants = [];
			for (const size of settings.imageSizes) {
				const processed = await encode(
					sharp(file.buffer, { limitInputPixels: settings.maxSourcePixels })
						.rotate()
						.resize({ fit: size.fit, height: size.height, withoutEnlargement: true, width: size.width }),
				).toBuffer({ resolveWithObject: true });
				const variantKey = `${prefix}/${size.name}.${format.extension}`;
				await storage.write(variantKey, processed.data);
				variants.push({
					byteSize: processed.data.length,
					height: processed.info.height,
					mimeType: format.mimeType,
					name: size.name,
					storageKey: variantKey,
					width: processed.info.width,
				});
			}
			return await repository.create({
				actorId,
				byteSize: original.data.length,
				defaultAltText,
				extension: format.extension,
				height: original.info.height,
				mimeType: format.mimeType,
				originalFilename: file.originalname.slice(0, 255),
				sha256: createHash('sha256').update(original.data).digest(),
				storageKey,
				uuid,
				variants,
				width: original.info.width,
			});
		} catch (error) {
			await storage.deletePrefix(prefix);
			throw error;
		}
	}
	return { upload };
}
