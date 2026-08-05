-- migrate:up
INSERT INTO content_types (slug, label) VALUES ('article', 'Article');

-- migrate:down
DELETE FROM content_types WHERE slug = 'article';
