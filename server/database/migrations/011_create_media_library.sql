-- migrate:up
CREATE TABLE media_settings (
	id TINYINT UNSIGNED NOT NULL,
	accepted_mime_types JSON NOT NULL,
	image_sizes JSON NOT NULL,
	max_upload_bytes INT UNSIGNED NOT NULL DEFAULT 10485760,
	max_source_width INT UNSIGNED NOT NULL DEFAULT 12000,
	max_source_height INT UNSIGNED NOT NULL DEFAULT 12000,
	max_source_pixels BIGINT UNSIGNED NOT NULL DEFAULT 40000000,
	updated_by_user_id BIGINT UNSIGNED NULL,
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id),
	CONSTRAINT chk_media_settings_singleton CHECK (id = 1),
	CONSTRAINT fk_media_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO media_settings (id, accepted_mime_types, image_sizes)
VALUES (
	1,
	JSON_ARRAY('image/jpeg', 'image/png'),
	JSON_ARRAY(
		JSON_OBJECT('name', 'thumbnail', 'width', 320, 'height', 320, 'fit', 'cover'),
		JSON_OBJECT('name', 'medium', 'width', 768, 'height', 768, 'fit', 'inside'),
		JSON_OBJECT('name', 'large', 'width', 1600, 'height', 1600, 'fit', 'inside')
	)
);

CREATE TABLE media_assets (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	uploaded_by_user_id BIGINT UNSIGNED NULL,
	original_filename VARCHAR(255) NOT NULL,
	storage_key VARCHAR(500) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	mime_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	extension VARCHAR(8) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	width INT UNSIGNED NOT NULL,
	height INT UNSIGNED NOT NULL,
	byte_size BIGINT UNSIGNED NOT NULL,
	sha256 BINARY(32) NOT NULL,
	status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'ready',
	default_alt_text VARCHAR(500) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id),
	UNIQUE KEY uq_media_assets_uuid (uuid),
	UNIQUE KEY uq_media_assets_storage_key (storage_key),
	KEY idx_media_assets_created (created_at DESC, id DESC),
	CONSTRAINT chk_media_assets_mime CHECK (mime_type IN ('image/jpeg', 'image/png')),
	CONSTRAINT chk_media_assets_status CHECK (status IN ('processing', 'ready', 'failed')),
	CONSTRAINT fk_media_assets_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_variants (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	media_asset_id BIGINT UNSIGNED NOT NULL,
	variant_name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	storage_key VARCHAR(500) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	mime_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	width INT UNSIGNED NOT NULL,
	height INT UNSIGNED NOT NULL,
	byte_size BIGINT UNSIGNED NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	PRIMARY KEY (id),
	UNIQUE KEY uq_media_variants_name (media_asset_id, variant_name),
	UNIQUE KEY uq_media_variants_storage_key (storage_key),
	CONSTRAINT fk_media_variants_asset FOREIGN KEY (media_asset_id) REFERENCES media_assets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- migrate:down
DROP TABLE media_variants;
DROP TABLE media_assets;
DROP TABLE media_settings;
