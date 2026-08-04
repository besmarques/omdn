-- migrate:up transaction:false
CREATE INDEX idx_users_deleted_retention
	ON users (status, deleted_at, id);

-- migrate:down transaction:false
DROP INDEX idx_users_deleted_retention ON users;
