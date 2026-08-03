-- Active: 1785708046351@@127.0.0.1@3306@omdn

CREATE TABLE users (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	email VARCHAR(254) NOT NULL,
	display_name VARCHAR(100) NOT NULL,
	password_hash VARCHAR(255) NULL,
	status ENUM('pending', 'active', 'blocked', 'deleted')
		NOT NULL DEFAULT 'pending',
	email_verified_at DATETIME(3) NULL,
	password_changed_at DATETIME(3) NULL,
	last_login_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),
	deleted_at DATETIME(3) NULL,

	PRIMARY KEY (id),
	UNIQUE KEY uq_users_email (email),
	KEY idx_users_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE auth_identities (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	provider VARCHAR(32)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL,
	provider_subject VARCHAR(255)
		CHARACTER SET utf8mb4
		COLLATE utf8mb4_bin
		NOT NULL,
	provider_email VARCHAR(254) NULL,
	provider_email_verified TINYINT(1) NOT NULL DEFAULT 0,
	profile_data JSON NULL,
	last_used_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_auth_identity_provider_subject (
		provider,
		provider_subject
	),
	UNIQUE KEY uq_auth_identity_user_provider (
		user_id,
		provider
	),

	CONSTRAINT fk_auth_identities_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE roles (
	id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
	slug VARCHAR(50)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL,
	label VARCHAR(100) NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_roles_slug (slug)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE permissions (
	id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
	code VARCHAR(100)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL,
	description VARCHAR(255) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_roles (
	user_id BIGINT UNSIGNED NOT NULL,
	role_id SMALLINT UNSIGNED NOT NULL,
	assigned_by BIGINT UNSIGNED NULL,
	assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (user_id, role_id),
	KEY idx_user_roles_role (role_id),
	KEY idx_user_roles_assigned_by (assigned_by),

	CONSTRAINT fk_user_roles_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE,

	CONSTRAINT fk_user_roles_role
		FOREIGN KEY (role_id)
		REFERENCES roles (id)
		ON DELETE CASCADE,

	CONSTRAINT fk_user_roles_assigned_by
		FOREIGN KEY (assigned_by)
		REFERENCES users (id)
		ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE role_permissions (
	role_id SMALLINT UNSIGNED NOT NULL,
	permission_id SMALLINT UNSIGNED NOT NULL,

	PRIMARY KEY (role_id, permission_id),
	KEY idx_role_permissions_permission (permission_id),

	CONSTRAINT fk_role_permissions_role
		FOREIGN KEY (role_id)
		REFERENCES roles (id)
		ON DELETE CASCADE,

	CONSTRAINT fk_role_permissions_permission
		FOREIGN KEY (permission_id)
		REFERENCES permissions (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE sessions (
	session_id VARCHAR(128)
		CHARACTER SET ascii
		COLLATE ascii_bin
		NOT NULL,
	expires INT UNSIGNED NOT NULL,
	data MEDIUMTEXT NOT NULL,
	user_id BIGINT UNSIGNED NULL,
	ip_address VARBINARY(16) NULL,
	user_agent VARCHAR(512) NULL,
	last_seen_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (session_id),
	KEY idx_sessions_expires (expires),
	KEY idx_sessions_user (user_id),

	CONSTRAINT fk_sessions_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE email_verification_tokens (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	token_hash BINARY(32) NOT NULL,
	expires_at DATETIME(3) NOT NULL,
	used_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_email_verification_token_hash (token_hash),
	KEY idx_email_verification_user (user_id),
	KEY idx_email_verification_expires (expires_at),

	CONSTRAINT fk_email_verification_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE password_reset_tokens (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	token_hash BINARY(32) NOT NULL,
	expires_at DATETIME(3) NOT NULL,
	used_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_password_reset_token_hash (token_hash),
	KEY idx_password_reset_user (user_id),
	KEY idx_password_reset_expires (expires_at),

	CONSTRAINT fk_password_reset_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_totp (
	user_id BIGINT UNSIGNED NOT NULL,
	secret_encrypted TEXT NOT NULL,
	algorithm ENUM('SHA1', 'SHA256', 'SHA512')
		NOT NULL DEFAULT 'SHA1',
	digits TINYINT UNSIGNED NOT NULL DEFAULT 6,
	period SMALLINT UNSIGNED NOT NULL DEFAULT 30,
	is_enabled TINYINT(1) NOT NULL DEFAULT 0,
	verified_at DATETIME(3) NULL,
	last_used_step BIGINT UNSIGNED NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (user_id),

	CONSTRAINT fk_user_totp_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE user_recovery_codes (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	code_hash VARCHAR(255)
		CHARACTER SET ascii
		COLLATE ascii_bin
		NOT NULL,
	used_at DATETIME(3) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	UNIQUE KEY uq_recovery_code_user_hash (
		user_id,
		code_hash
	),
	KEY idx_recovery_codes_user_unused (
		user_id,
		used_at
	),

	CONSTRAINT fk_recovery_codes_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_events (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NULL,
	session_id VARCHAR(128)
		CHARACTER SET ascii
		COLLATE ascii_bin
		NULL,
	event_type VARCHAR(64)
		CHARACTER SET ascii
		COLLATE ascii_general_ci
		NOT NULL,
	success TINYINT(1) NOT NULL DEFAULT 1,
	ip_address VARBINARY(16) NULL,
	user_agent VARCHAR(512) NULL,
	metadata JSON NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	KEY idx_auth_events_user (user_id),
	KEY idx_auth_events_type (event_type),
	KEY idx_auth_events_created (created_at),

	CONSTRAINT fk_auth_events_user
		FOREIGN KEY (user_id)
		REFERENCES users (id)
		ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;