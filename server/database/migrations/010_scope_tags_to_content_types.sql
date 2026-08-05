-- migrate:up transaction:false

ALTER TABLE tags
	DROP INDEX uq_tags_normalized_name,
	ADD COLUMN content_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER id;

UPDATE tags SET content_type = 'recipe';

ALTER TABLE tags
	MODIFY content_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	ADD UNIQUE KEY uq_tags_type_name (content_type, normalized_name),
	ADD KEY idx_tags_content_type (content_type, name),
	ADD CONSTRAINT fk_tags_content_type
		FOREIGN KEY (content_type) REFERENCES content_types (slug)
		ON UPDATE RESTRICT ON DELETE RESTRICT;

-- migrate:down transaction:false
ALTER TABLE tags
	DROP FOREIGN KEY fk_tags_content_type,
	DROP INDEX idx_tags_content_type,
	DROP INDEX uq_tags_type_name,
	DROP COLUMN content_type,
	ADD UNIQUE KEY uq_tags_normalized_name (normalized_name);
