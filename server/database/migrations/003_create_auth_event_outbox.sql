-- migrate:up transaction:false
CREATE TABLE auth_event_outbox (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	payload JSON NOT NULL,
	attempts INT UNSIGNED NOT NULL DEFAULT 0,
	available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	locked_at DATETIME(3) NULL,
	locked_by CHAR(36)
		CHARACTER SET ascii
		COLLATE ascii_bin
		NULL,
	processed_at DATETIME(3) NULL,
	last_error VARCHAR(1000) NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (id),
	KEY idx_auth_event_outbox_pending (
		processed_at,
		available_at,
		locked_at,
		id
	)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

ALTER TABLE auth_events
	ADD COLUMN outbox_id BIGINT UNSIGNED NULL AFTER id,
	ADD UNIQUE KEY uq_auth_events_outbox (outbox_id);

-- migrate:down transaction:false
ALTER TABLE auth_events
	DROP INDEX uq_auth_events_outbox,
	DROP COLUMN outbox_id;

DROP TABLE auth_event_outbox;
