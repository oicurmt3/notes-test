<?php
declare(strict_types=1);

/**
 * App configuration.
 *
 * Locally this returns the defaults below, which use SQLite — nothing to
 * install, so the app runs immediately.
 *
 * On the server, create src/config.local.php (copied from
 * config.local.example.php) with your cPanel database details. That file
 * is git-ignored and never leaves the server.
 */

$config = [
    'driver'      => 'sqlite',
    'sqlite_path' => __DIR__ . '/../data/app.sqlite',

    // Timestamps are stored in UTC; this is how they are displayed.
    'timezone'    => 'Australia/Perth',

    'mysql' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'database' => 'perthrel_webapp',
        'username' => 'perthrel_webapp',
        'password' => '',
        'charset'  => 'utf8mb4',
    ],
];

$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    $override = require $local;
    if (is_array($override)) {
        $config = array_replace_recursive($config, $override);
    }
}

return $config;
