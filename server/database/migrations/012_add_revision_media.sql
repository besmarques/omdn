-- migrate:up
CREATE TABLE post_revision_media (
	revision_id BIGINT UNSIGNED NOT NULL,
	media_asset_id BIGINT UNSIGNED NOT NULL,
	role VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	sort_position SMALLINT UNSIGNED NOT NULL DEFAULT 0,
	alt_text VARCHAR(500) NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (revision_id, role, sort_position),
	UNIQUE KEY uq_post_revision_media_asset_role (revision_id, role, media_asset_id),
	KEY idx_post_revision_media_asset (media_asset_id, revision_id),
	CONSTRAINT chk_post_revision_media_role CHECK (role IN ('featured', 'gallery')),
	CONSTRAINT chk_post_revision_media_featured_position CHECK (role <> 'featured' OR sort_position = 0),
	CONSTRAINT fk_post_revision_media_revision FOREIGN KEY (revision_id) REFERENCES post_revisions (id) ON DELETE CASCADE,
	CONSTRAINT fk_post_revision_media_asset FOREIGN KEY (media_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrate:down
DROP TABLE post_revision_media;
