export default function createMediaRepository(db) {
	async function getSettings() {
		const [[row]] = await db.execute(
			`SELECT accepted_mime_types, image_sizes, max_upload_bytes, max_source_width, max_source_height, max_source_pixels
			 FROM media_settings WHERE id = 1`,
		);
		return normalizeSettings(row);
	}
	async function updateSettings(settings, actorId) {
		await db.execute(
			`UPDATE media_settings SET accepted_mime_types = ?, image_sizes = ?, max_upload_bytes = ?,
			 max_source_width = ?, max_source_height = ?, max_source_pixels = ?, updated_by_user_id = ? WHERE id = 1`,
			[
				JSON.stringify(settings.acceptedMimeTypes),
				JSON.stringify(settings.imageSizes),
				settings.maxUploadBytes,
				settings.maxSourceWidth,
				settings.maxSourceHeight,
				settings.maxSourcePixels,
				actorId,
			],
		);
		return settings;
	}
	async function create(asset) {
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [result] = await connection.execute(
				`INSERT INTO media_assets
				 (uuid, uploaded_by_user_id, original_filename, storage_key, mime_type, extension, width, height, byte_size, sha256, default_alt_text)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					asset.uuid,
					asset.actorId,
					asset.originalFilename,
					asset.storageKey,
					asset.mimeType,
					asset.extension,
					asset.width,
					asset.height,
					asset.byteSize,
					asset.sha256,
					asset.defaultAltText || null,
				],
			);
			for (const variant of asset.variants) {
				await connection.execute(
					`INSERT INTO media_variants (media_asset_id, variant_name, storage_key, mime_type, width, height, byte_size)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
					[result.insertId, variant.name, variant.storageKey, variant.mimeType, variant.width, variant.height, variant.byteSize],
				);
			}
			await connection.commit();
			return { id: Number(result.insertId), ...asset };
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}
	async function list() {
		const [assets] = await db.execute(
			`SELECT id, uuid, original_filename, mime_type, width, height, byte_size, default_alt_text, created_at
			 FROM media_assets WHERE status = 'ready' ORDER BY created_at DESC, id DESC`,
		);
		const [variants] = await db.execute(
			`SELECT media_asset_id, variant_name, width, height, byte_size FROM media_variants ORDER BY media_asset_id, width`,
		);
		return assets.map((asset) => ({
			...asset,
			byte_size: Number(asset.byte_size),
			height: Number(asset.height),
			id: Number(asset.id),
			variants: variants.filter((variant) => Number(variant.media_asset_id) === Number(asset.id)).map(normalizeVariant),
			width: Number(asset.width),
		}));
	}
	async function findFile(id, variantName) {
		if (variantName === 'original') {
			const [[asset]] = await db.execute(`SELECT storage_key, mime_type FROM media_assets WHERE id = ? AND status = 'ready'`, [id]);
			return asset ?? null;
		}
		const [[variant]] = await db.execute(
			`SELECT media_variants.storage_key, media_variants.mime_type
			 FROM media_variants INNER JOIN media_assets ON media_assets.id = media_variants.media_asset_id
			 WHERE media_variants.media_asset_id = ? AND media_variants.variant_name = ? AND media_assets.status = 'ready'`,
			[id, variantName],
		);
		return variant ?? null;
	}
	async function findPublicFile(uuid, variantName) {
		const [[variant]] = await db.execute(
			`SELECT media_variants.storage_key, media_variants.mime_type
			 FROM media_assets
			 INNER JOIN media_variants ON media_variants.media_asset_id = media_assets.id AND media_variants.variant_name = ?
			 WHERE media_assets.uuid = ? AND media_assets.status = 'ready'
			   AND EXISTS (
			     SELECT 1 FROM post_revision_media
			     INNER JOIN post_revision_heads ON post_revision_heads.published_revision_id = post_revision_media.revision_id
			     INNER JOIN posts ON posts.id = post_revision_heads.post_id
			     WHERE post_revision_media.media_asset_id = media_assets.id AND posts.status = 'published' AND posts.trashed_at IS NULL
			   )`,
			[variantName, uuid],
		);
		return variant ?? null;
	}
	return { create, findFile, findPublicFile, getSettings, list, updateSettings };
}

function normalizeSettings(row) {
	const parse = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
	return {
		acceptedMimeTypes: parse(row.accepted_mime_types),
		imageSizes: parse(row.image_sizes),
		maxSourceHeight: Number(row.max_source_height),
		maxSourcePixels: Number(row.max_source_pixels),
		maxSourceWidth: Number(row.max_source_width),
		maxUploadBytes: Number(row.max_upload_bytes),
	};
}
function normalizeVariant(variant) {
	return {
		byteSize: Number(variant.byte_size),
		height: Number(variant.height),
		name: variant.variant_name,
		width: Number(variant.width),
	};
}
