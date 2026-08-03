-- Active: 1785708046351@@127.0.0.1@3306@omdn
ALTER TABLE sessions
	DROP FOREIGN KEY fk_sessions_user,
	DROP INDEX idx_sessions_user,
	DROP COLUMN user_id,
	DROP COLUMN ip_address,
	DROP COLUMN user_agent,
	DROP COLUMN last_seen_at,
	DROP COLUMN created_at,
	DROP COLUMN updated_at;
