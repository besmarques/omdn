-- migrate:up transaction:false
ALTER TABLE sessions
	DROP FOREIGN KEY fk_sessions_user,
	DROP INDEX idx_sessions_user,
	DROP COLUMN user_id,
	DROP COLUMN ip_address,
	DROP COLUMN user_agent,
	DROP COLUMN last_seen_at,
	DROP COLUMN created_at,
	DROP COLUMN updated_at;

-- migrate:down transaction:false
SIGNAL SQLSTATE '45000'
	SET MESSAGE_TEXT = 'Migration 004 discarded session metadata and is irreversible';
