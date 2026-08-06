export async function insertRevisionMedia(connection, revisionId, media) {
	const usages = [
		...(media.featured ? [{ ...media.featured, role: 'featured', sortPosition: 0 }] : []),
		...media.gallery.map((usage, sortPosition) => ({ ...usage, role: 'gallery', sortPosition })),
	];
	const ids = [...new Set(usages.map(({ id }) => id))];
	if (ids.length > 0) {
		const placeholders = ids.map(() => '?').join(', ');
		const [assets] = await connection.execute(`SELECT id FROM media_assets WHERE status = 'ready' AND id IN (${placeholders})`, ids);
		if (assets.length !== ids.length) throw new RangeError('One or more selected images are unavailable');
	}
	for (const usage of usages) {
		await connection.execute(
			`INSERT INTO post_revision_media (revision_id, media_asset_id, role, sort_position, alt_text) VALUES (?, ?, ?, ?, ?)`,
			[revisionId, usage.id, usage.role, usage.sortPosition, usage.altText],
		);
	}
}
