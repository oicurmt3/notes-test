<?php
declare(strict_types=1);

/**
 * Copy this file to config.local.php and fill in the real values.
 *
 * cPanel creates database and user names with your account prefix,
 * so "webapp" becomes something like "perthrel_webapp".
 * Never commit config.local.php — it holds the password.
 */

return [
    'driver' => 'mysql',

    'mysql' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'database' => 'perthrel_webapp',
        'username' => 'perthrel_webapp',
        'password' => 'CHANGE_ME',
        'charset'  => 'utf8mb4',
    ],
];
