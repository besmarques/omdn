CREATE INDEX idx_users_deleted_retention
	ON users (status, deleted_at, id);
