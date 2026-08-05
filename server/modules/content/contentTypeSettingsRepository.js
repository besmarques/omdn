export default function createContentTypeSettingsRepository(db) {
	return Object.freeze({
		async getArchiveSeo(contentType) {
			const [[row]] = await db.execute(
				`SELECT archive_seo_title, archive_seo_description FROM content_types WHERE slug = ? AND is_enabled = 1`,
				[contentType],
			);
			return row ? { description: row.archive_seo_description, title: row.archive_seo_title } : null;
		},
	});
}
