<?php
declare(strict_types=1);

/**
 * One place for the database. Every page includes this file.
 *
 * Two drivers, one API:
 *   - sqlite (local default) — the whole database is one file, no setup.
 *   - mysql  (on cPanel)     — set driver => 'mysql' in config.local.php.
 *
 * The SQL below is the same either way, so page code never changes.
 */

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $driver = $config['driver'] ?? 'sqlite';

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    if ($driver === 'mysql') {
        $my = $config['mysql'];
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $my['host'],
            (int) $my['port'],
            $my['database'],
            $my['charset']
        );
        $pdo = new PDO($dsn, $my['username'], $my['password'], $options);
    } else {
        $path = $config['sqlite_path'];
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . $path, null, null, $options);
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    // First run creates the table. Add new tables here (and in sql/schema.sql).
    if ($driver === 'mysql') {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS notes (
                id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
                body       TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } else {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS notes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                body       TEXT NOT NULL,
                created_at TEXT NOT NULL
            )'
        );
    }

    return $pdo;
}
