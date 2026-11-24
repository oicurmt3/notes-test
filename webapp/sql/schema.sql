-- Schema for the MySQL/MariaDB version (cPanel).
-- The app also creates this table on first run; use this file when you
-- prefer importing through phpMyAdmin, or to recreate it by hand.

CREATE TABLE IF NOT EXISTS notes (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
    body       TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
