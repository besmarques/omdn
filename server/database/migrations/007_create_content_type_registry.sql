-- migrate:up transaction:false

CREATE TABLE content_types (
	slug VARCHAR(32)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL,
	label VARCHAR(100) NOT NULL,
	is_enabled TINYINT(1) NOT NULL DEFAULT 1,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (slug),

	CONSTRAINT chk_content_types_enabled
		CHECK (is_enabled IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

INSERT INTO content_types (slug, label)
VALUES ('recipe', 'Recipe');

ALTER TABLE posts
	DROP CONSTRAINT chk_posts_content_type,
	ADD KEY idx_posts_content_type_status_published (content_type, status, published_at DESC, id DESC),
	ADD CONSTRAINT fk_posts_content_type
		FOREIGN KEY (content_type)
		REFERENCES content_types (slug)
		ON UPDATE RESTRICT
		ON DELETE RESTRICT;

-- migrate:down transaction:false
ALTER TABLE posts
	DROP FOREIGN KEY fk_posts_content_type,
	DROP INDEX idx_posts_content_type_status_published,
	ADD CONSTRAINT chk_posts_content_type
		CHECK (content_type IN ('recipe'));

DROP TABLE content_types;
