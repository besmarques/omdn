-- Active: 1785887395933@@127.0.0.1@3306@omdn
-- migrate:up transaction:false

CREATE TABLE authors (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	display_name VARCHAR(100) NOT NULL,
	biography_html TEXT NULL,
	biography_plain_text TEXT NULL,
	lock_version INT UNSIGNED NOT NULL DEFAULT 1,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_authors_user (user_id),

	CONSTRAINT fk_authors_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	parent_id BIGINT UNSIGNED NULL,
	name VARCHAR(120) NOT NULL,
	description TEXT NULL,
	lock_version INT UNSIGNED NOT NULL DEFAULT 1,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	KEY idx_categories_parent (parent_id),

	CONSTRAINT fk_categories_parent
		FOREIGN KEY (parent_id)
		REFERENCES categories (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tags (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	name VARCHAR(120) NOT NULL,
	normalized_name VARCHAR(120) NOT NULL,
	lock_version INT UNSIGNED NOT NULL DEFAULT 1,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_tags_normalized_name (normalized_name)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE posts (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	owner_user_id BIGINT UNSIGNED NOT NULL,
	author_id BIGINT UNSIGNED NOT NULL,
	content_type VARCHAR(32)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL,
	status VARCHAR(32)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL DEFAULT 'draft',
	visibility VARCHAR(16)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL DEFAULT 'public',
	is_pillar_content TINYINT(1) NOT NULL DEFAULT 0,
	primary_category_id BIGINT UNSIGNED NULL,
	lock_version INT UNSIGNED NOT NULL DEFAULT 1,
	published_at DATETIME(3) NULL,
	archived_at DATETIME(3) NULL,
	trashed_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	KEY idx_posts_owner_status_updated (owner_user_id, status, updated_at DESC, id DESC),
	KEY idx_posts_author_status_published (author_id, status, published_at DESC, id DESC),
	KEY idx_posts_primary_category_status_published (primary_category_id, status, published_at DESC, id DESC),
	KEY idx_posts_status_published (status, published_at DESC, id DESC),
	KEY idx_posts_status_updated (status, updated_at DESC, id DESC),

	CONSTRAINT chk_posts_content_type
		CHECK (content_type IN ('recipe')),
	CONSTRAINT chk_posts_status
		CHECK (status IN ('draft', 'in_review', 'scheduled', 'published', 'archived', 'trashed')),
	CONSTRAINT chk_posts_visibility
		CHECK (visibility IN ('public', 'private')),
	CONSTRAINT chk_posts_pillar
		CHECK (is_pillar_content IN (0, 1)),

	CONSTRAINT fk_posts_owner
		FOREIGN KEY (owner_user_id)
		REFERENCES users (id)
		ON DELETE RESTRICT,
	CONSTRAINT fk_posts_author
		FOREIGN KEY (author_id)
		REFERENCES authors (id)
		ON DELETE RESTRICT,
	CONSTRAINT fk_posts_primary_category
		FOREIGN KEY (primary_category_id)
		REFERENCES categories (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_revisions (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	post_id BIGINT UNSIGNED NOT NULL,
	revision_number INT UNSIGNED NOT NULL,
	created_by_user_id BIGINT UNSIGNED NULL,
	title VARCHAR(255) NOT NULL,
	excerpt TEXT NULL,
	seo_title VARCHAR(255) NULL,
	seo_description VARCHAR(320) NULL,
	focus_keyword VARCHAR(500) NULL,
	layout_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	template_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	header_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	footer_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	region_config JSON NOT NULL,
	source JSON NOT NULL,
	source_schema_version SMALLINT UNSIGNED NOT NULL,
	render_version SMALLINT UNSIGNED NOT NULL,
	plain_text MEDIUMTEXT NOT NULL,
	source_sha256 BINARY(32) NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_post_revisions_number (post_id, revision_number),
	UNIQUE KEY uq_post_revisions_post_id (post_id, id),
	KEY idx_post_revisions_created_by (created_by_user_id),
	KEY idx_post_revisions_created (post_id, created_at DESC, id DESC),

	CONSTRAINT fk_post_revisions_post
		FOREIGN KEY (post_id)
		REFERENCES posts (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_post_revisions_created_by
		FOREIGN KEY (created_by_user_id)
		REFERENCES users (id)
		ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_revision_heads (
	post_id BIGINT UNSIGNED NOT NULL,
	current_revision_id BIGINT UNSIGNED NOT NULL,
	submitted_revision_id BIGINT UNSIGNED NULL,
	published_revision_id BIGINT UNSIGNED NULL,
	submitted_by_user_id BIGINT UNSIGNED NULL,
	submitted_at DATETIME(3) NULL,

	PRIMARY KEY (post_id),
	KEY idx_post_revision_heads_current (post_id, current_revision_id),
	KEY idx_post_revision_heads_submitted (post_id, submitted_revision_id),
	KEY idx_post_revision_heads_published (post_id, published_revision_id),
	KEY idx_post_revision_heads_submitted_by (submitted_by_user_id),

	CONSTRAINT chk_post_revision_heads_submission
		CHECK (
			(submitted_revision_id IS NULL AND submitted_at IS NULL)
			OR
			(submitted_revision_id IS NOT NULL AND submitted_at IS NOT NULL)
		),

	CONSTRAINT fk_post_revision_heads_post
		FOREIGN KEY (post_id)
		REFERENCES posts (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_post_revision_heads_current
		FOREIGN KEY (post_id, current_revision_id)
		REFERENCES post_revisions (post_id, id)
		ON DELETE RESTRICT,
	CONSTRAINT fk_post_revision_heads_submitted
		FOREIGN KEY (post_id, submitted_revision_id)
		REFERENCES post_revisions (post_id, id)
		ON DELETE RESTRICT,
	CONSTRAINT fk_post_revision_heads_published
		FOREIGN KEY (post_id, published_revision_id)
		REFERENCES post_revisions (post_id, id)
		ON DELETE RESTRICT,
	CONSTRAINT fk_post_revision_heads_submitted_by
		FOREIGN KEY (submitted_by_user_id)
		REFERENCES users (id)
		ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_categories (
	post_id BIGINT UNSIGNED NOT NULL,
	category_id BIGINT UNSIGNED NOT NULL,

	PRIMARY KEY (post_id, category_id),
	KEY idx_post_categories_category (category_id, post_id),

	CONSTRAINT fk_post_categories_post
		FOREIGN KEY (post_id)
		REFERENCES posts (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_post_categories_category
		FOREIGN KEY (category_id)
		REFERENCES categories (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_tags (
	post_id BIGINT UNSIGNED NOT NULL,
	tag_id BIGINT UNSIGNED NOT NULL,

	PRIMARY KEY (post_id, tag_id),
	KEY idx_post_tags_tag (tag_id, post_id),

	CONSTRAINT fk_post_tags_post
		FOREIGN KEY (post_id)
		REFERENCES posts (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_post_tags_tag
		FOREIGN KEY (tag_id)
		REFERENCES tags (id)
		ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE route_slugs (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	resource_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	resource_id BIGINT UNSIGNED NOT NULL,
	slug VARCHAR(200) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
	kind VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	canonical_slot TINYINT UNSIGNED
		GENERATED ALWAYS AS (CASE WHEN kind = 'canonical' THEN 1 ELSE NULL END) STORED,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_route_slugs_slug (slug),
	UNIQUE KEY uq_route_slugs_canonical (resource_type, resource_id, canonical_slot),
	KEY idx_route_slugs_resource (resource_type, resource_id, kind),

	CONSTRAINT chk_route_slugs_resource_type
		CHECK (resource_type IN ('post', 'category', 'author', 'tag')),
	CONSTRAINT chk_route_slugs_kind
		CHECK (kind IN ('canonical', 'redirect'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE publication_schedules (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	post_id BIGINT UNSIGNED NOT NULL,
	revision_id BIGINT UNSIGNED NOT NULL,
	publish_at DATETIME(3) NOT NULL,
	status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT 'pending',
	active_post_id BIGINT UNSIGNED
		GENERATED ALWAYS AS (CASE WHEN status IN ('pending', 'processing') THEN post_id ELSE NULL END) STORED,
	attempts INT UNSIGNED NOT NULL DEFAULT 0,
	available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	locked_at DATETIME(3) NULL,
	locked_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
	processed_at DATETIME(3) NULL,
	last_error VARCHAR(1000) NULL,
	created_by_user_id BIGINT UNSIGNED NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_publication_schedules_active_post (active_post_id),
	KEY idx_publication_schedules_post_revision (post_id, revision_id),
	KEY idx_publication_schedules_pending (status, available_at, locked_at, id),
	KEY idx_publication_schedules_created_by (created_by_user_id),

	CONSTRAINT chk_publication_schedules_status
		CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed')),

	CONSTRAINT fk_publication_schedules_post
		FOREIGN KEY (post_id)
		REFERENCES posts (id)
		ON DELETE CASCADE,
	CONSTRAINT fk_publication_schedules_revision
		FOREIGN KEY (post_id, revision_id)
		REFERENCES post_revisions (post_id, id)
		ON DELETE RESTRICT,
	CONSTRAINT fk_publication_schedules_created_by
		FOREIGN KEY (created_by_user_id)
		REFERENCES users (id)
		ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE domain_outbox (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	aggregate_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	aggregate_id BIGINT UNSIGNED NOT NULL,
	event_type VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	payload JSON NOT NULL,
	attempts INT UNSIGNED NOT NULL DEFAULT 0,
	available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	locked_at DATETIME(3) NULL,
	locked_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
	processed_at DATETIME(3) NULL,
	last_error VARCHAR(1000) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	KEY idx_domain_outbox_pending (processed_at, available_at, locked_at, id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_events (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	outbox_id BIGINT UNSIGNED NULL,
	post_id BIGINT UNSIGNED NULL,
	revision_id BIGINT UNSIGNED NULL,
	actor_user_id BIGINT UNSIGNED NULL,
	event_type VARCHAR(64) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	metadata JSON NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_content_events_outbox (outbox_id),
	KEY idx_content_events_post (post_id),
	KEY idx_content_events_revision (revision_id),
	KEY idx_content_events_actor (actor_user_id),
	KEY idx_content_events_type (event_type),
	KEY idx_content_events_created (created_at),

	CONSTRAINT fk_content_events_outbox
		FOREIGN KEY (outbox_id)
		REFERENCES domain_outbox (id)
		ON DELETE SET NULL,
	CONSTRAINT fk_content_events_post
		FOREIGN KEY (post_id)
		REFERENCES posts (id)
		ON DELETE SET NULL,
	CONSTRAINT fk_content_events_revision
		FOREIGN KEY (revision_id)
		REFERENCES post_revisions (id)
		ON DELETE SET NULL,
	CONSTRAINT fk_content_events_actor
		FOREIGN KEY (actor_user_id)
		REFERENCES users (id)
		ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- migrate:down transaction:false
DROP TABLE content_events;
DROP TABLE domain_outbox;
DROP TABLE publication_schedules;
DROP TABLE route_slugs;
DROP TABLE post_tags;
DROP TABLE post_categories;
DROP TABLE post_revision_heads;
DROP TABLE post_revisions;
DROP TABLE posts;
DROP TABLE tags;
DROP TABLE categories;
DROP TABLE authors;
