-- Active: 1785887395933@@127.0.0.1@3306@omdn
START TRANSACTION;

INSERT INTO roles (slug, label)
VALUES
	('administrator', 'Administrator'),
	('editor', 'Editor'),
	('author', 'Author'),
	('contributor', 'Contributor'),
	('subscriber', 'Subscriber')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO permissions (code, description)
VALUES
	('users.manage', 'Create, edit, block and delete users'),
	('roles.manage', 'Manage roles and permissions'),
	('posts.create', 'Create posts'),
	('posts.edit_own', 'Edit own posts'),
	('posts.edit_all', 'Edit posts created by other users'),
	('posts.submit_own', 'Submit or withdraw own posts for review'),
	('posts.review_all', 'Review posts submitted by any user'),
	('posts.publish_own', 'Publish and schedule own posts'),
	('posts.publish_all', 'Publish and schedule posts created by any user'),
	('posts.delete_own', 'Delete own posts'),
	('posts.delete_all', 'Delete posts created by other users'),
	('posts.delete_permanent', 'Permanently delete eligible trashed posts'),
	('settings.manage', 'Manage website settings')
ON DUPLICATE KEY UPDATE description = VALUES(description);

DELETE role_permissions
FROM role_permissions
INNER JOIN roles
	ON roles.id = role_permissions.role_id
WHERE roles.slug IN ('administrator', 'editor', 'author', 'contributor', 'subscriber');

DELETE FROM permissions
WHERE code = 'posts.publish';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.slug = 'administrator';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.slug = 'editor'
	AND permissions.code IN (
		'posts.create',
		'posts.edit_all',
		'posts.review_all',
		'posts.publish_all',
		'posts.delete_all'
	);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.slug = 'author'
	AND permissions.code IN (
		'posts.create',
		'posts.edit_own',
		'posts.submit_own',
		'posts.publish_own',
		'posts.delete_own'
	);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.slug = 'contributor'
	AND permissions.code IN (
		'posts.create',
		'posts.edit_own',
		'posts.submit_own',
		'posts.delete_own'
	);

COMMIT;
