INSERT IGNORE INTO roles (slug, label)
VALUES
	('administrator', 'Administrator'),
	('editor', 'Editor'),
	('author', 'Author'),
	('contributor', 'Contributor'),
	('subscriber', 'Subscriber');

INSERT IGNORE INTO permissions (code, description)
VALUES
	('users.manage', 'Create, edit, block and delete users'),
	('roles.manage', 'Manage roles and permissions'),
	('posts.create', 'Create posts'),
	('posts.edit_own', 'Edit own posts'),
	('posts.edit_all', 'Edit posts created by other users'),
	('posts.publish', 'Publish posts'),
	('posts.delete_own', 'Delete own posts'),
	('posts.delete_all', 'Delete posts created by other users'),
	('settings.manage', 'Manage website settings');

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
		'posts.edit_own',
		'posts.edit_all',
		'posts.publish',
		'posts.delete_own',
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
		'posts.publish',
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
		'posts.delete_own'
	);