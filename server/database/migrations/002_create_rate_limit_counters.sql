CREATE TABLE rate_limit_counters (
	namespace VARCHAR(64)
		CHARACTER SET ascii
		COLLATE ascii_bin
		NOT NULL,
	key_hash BINARY(32) NOT NULL,
	hits INT UNSIGNED NOT NULL,
	reset_at DATETIME(3) NOT NULL,
	created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
		ON UPDATE CURRENT_TIMESTAMP(3),

	PRIMARY KEY (namespace, key_hash),
	KEY idx_rate_limit_counters_reset (reset_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
