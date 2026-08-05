-- migrate:up transaction:false

ALTER TABLE content_types
	ADD COLUMN archive_seo_title VARCHAR(255) NULL AFTER label,
	ADD COLUMN archive_seo_description VARCHAR(320) NULL AFTER archive_seo_title;

UPDATE content_types
SET archive_seo_title = CASE slug
		WHEN 'recipe' THEN 'Receitas de Natal | O Melhor do Natal'
		WHEN 'article' THEN 'Artigos de Natal | O Melhor do Natal'
	END,
	archive_seo_description = CASE slug
		WHEN 'recipe' THEN 'Receitas de Natal para preparar, partilhar e celebrar.'
		WHEN 'article' THEN 'Artigos para inspirar e preparar um Natal especial.'
	END;

ALTER TABLE categories
	ADD COLUMN content_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NULL AFTER id,
	ADD COLUMN normalized_name VARCHAR(120) NOT NULL DEFAULT '' AFTER name;

UPDATE categories SET content_type = 'recipe', normalized_name = LOWER(TRIM(name));

ALTER TABLE categories
	MODIFY content_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
	ADD UNIQUE KEY uq_categories_type_name (content_type, normalized_name),
	ADD KEY idx_categories_content_type (content_type, name),
	ADD CONSTRAINT fk_categories_content_type
		FOREIGN KEY (content_type) REFERENCES content_types (slug)
		ON UPDATE RESTRICT ON DELETE RESTRICT;

-- migrate:down transaction:false
ALTER TABLE categories
	DROP FOREIGN KEY fk_categories_content_type,
	DROP INDEX idx_categories_content_type,
	DROP INDEX uq_categories_type_name,
	DROP COLUMN normalized_name,
	DROP COLUMN content_type;

ALTER TABLE content_types
	DROP COLUMN archive_seo_description,
	DROP COLUMN archive_seo_title;
