-- Active: 1785887395933@@127.0.0.1@3306@omdn
START TRANSACTION;

INSERT INTO users (email, display_name, status, email_verified_at)
SELECT 'recipe.seed@omdn.local', 'Cozinha OMDN', 'active', CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (
	SELECT 1 FROM users WHERE email = 'recipe.seed@omdn.local'
);

SET @seed_recipe_user_id = (
	SELECT id FROM users WHERE email = 'recipe.seed@omdn.local' LIMIT 1
);

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT @seed_recipe_user_id, id
FROM roles
WHERE slug = 'author';

INSERT INTO authors (user_id, display_name, biography_plain_text)
SELECT @seed_recipe_user_id, 'Cozinha OMDN', 'Receitas de exemplo de O Melhor do Natal.'
WHERE NOT EXISTS (
	SELECT 1 FROM authors WHERE user_id = @seed_recipe_user_id
);

SET @seed_recipe_author_id = (
	SELECT id FROM authors WHERE user_id = @seed_recipe_user_id LIMIT 1
);

SET @seed_recipe_post_id = (
	SELECT resource_id
	FROM route_slugs
	WHERE resource_type = 'post' AND slug = 'bolachas-de-gengibre'
	LIMIT 1
);

INSERT INTO posts (
	owner_user_id,
	author_id,
	content_type,
	status,
	visibility,
	published_at
)
SELECT
	@seed_recipe_user_id,
	@seed_recipe_author_id,
	'recipe',
	'published',
	'public',
	'2025-12-01 10:00:00.000'
WHERE @seed_recipe_post_id IS NULL;

SET @seed_recipe_post_id = COALESCE(@seed_recipe_post_id, LAST_INSERT_ID());

SET @seed_recipe_source = JSON_OBJECT(
	'cookMinutes', 12,
	'description', 'Bolachas aromáticas e simples para preparar durante o Natal.',
	'difficulty', 'easy',
	'ingredients', JSON_ARRAY(
		JSON_OBJECT('id', 'farinha', 'name', 'farinha', 'quantity', '250', 'unit', 'g'),
		JSON_OBJECT('id', 'manteiga', 'name', 'manteiga', 'quantity', '100', 'unit', 'g'),
		JSON_OBJECT('id', 'acucar', 'name', 'açúcar mascavado', 'quantity', '100', 'unit', 'g'),
		JSON_OBJECT('id', 'gengibre', 'name', 'gengibre em pó', 'quantity', '2', 'unit', 'colheres de chá')
	),
	'instructions', JSON_ARRAY(
		JSON_OBJECT('id', 'misturar', 'title', 'Misturar', 'text', 'Misture a farinha, o açúcar e o gengibre.'),
		JSON_OBJECT('id', 'amassar', 'title', 'Amassar', 'text', 'Junte a manteiga e trabalhe até obter uma massa uniforme.'),
		JSON_OBJECT('id', 'cozer', 'title', 'Cozer', 'text', 'Corte as bolachas e leve ao forno a 180 °C durante 12 minutos.')
	),
	'kind', 'recipe',
	'prepMinutes', 25,
	'schemaVersion', 1,
	'title', 'Bolachas de gengibre',
	'yield', JSON_OBJECT('quantity', 24, 'unit', 'bolachas')
);

SET @seed_recipe_revision_id = (
	SELECT id
	FROM post_revisions
	WHERE post_id = @seed_recipe_post_id AND revision_number = 1
	LIMIT 1
);

INSERT INTO post_revisions (
	post_id,
	revision_number,
	created_by_user_id,
	title,
	excerpt,
	seo_title,
	seo_description,
	layout_key,
	template_key,
	header_key,
	footer_key,
	region_config,
	source,
	source_schema_version,
	render_version,
	plain_text,
	source_sha256
)
SELECT
	@seed_recipe_post_id,
	1,
	@seed_recipe_user_id,
	'Bolachas de gengibre',
	'Bolachas aromáticas e simples para preparar durante o Natal.',
	'Bolachas de gengibre | O Melhor do Natal',
	'Aprenda a preparar bolachas de gengibre simples e aromáticas para o Natal.',
	'full-width',
	'recipe',
	'minimal',
	'standard',
	JSON_OBJECT('sidebar', JSON_ARRAY()),
	@seed_recipe_source,
	1,
	1,
	'Bolachas de gengibre\nBolachas aromáticas e simples para preparar durante o Natal.\n250 g farinha\n100 g manteiga\n100 g açúcar mascavado\n2 colheres de chá gengibre em pó',
	UNHEX(SHA2(@seed_recipe_source, 256))
WHERE @seed_recipe_revision_id IS NULL;

SET @seed_recipe_revision_id = COALESCE(@seed_recipe_revision_id, LAST_INSERT_ID());

INSERT IGNORE INTO post_revision_heads (
	post_id,
	current_revision_id,
	published_revision_id
)
VALUES (
	@seed_recipe_post_id,
	@seed_recipe_revision_id,
	@seed_recipe_revision_id
);

INSERT IGNORE INTO route_slugs (resource_type, resource_id, slug, kind)
VALUES ('post', @seed_recipe_post_id, 'bolachas-de-gengibre', 'canonical');

COMMIT;
