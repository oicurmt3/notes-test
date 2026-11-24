# Starter web app

A working model to copy for each new app: plain PHP, SQLite locally, MySQL on the
server, with the deploy script already wired up.

**This folder is not deployed itself.** Copy it, rename the copy, and build in
the copy.

```
Copy-Item -Recurse starter my-new-app
cd my-new-app
.\run.ps1                      # http://127.0.0.1:8000
```

## What's already done for you

| File | Purpose |
|---|---|
| `index.php` | A working notes page: list, add, delete — replace with your app |
| `assets/style.css` | Card layout, dark mode, mobile-first, accessible focus rings |
| `inc/config.php` | Chooses SQLite or MySQL; loads `config.local.php` if present |
| `inc/db.php` | `db()` returns a PDO connection and creates the table on first run |
| `inc/.htaccess` | Denies direct requests for the `inc/` folder |
| `sql/schema.sql` | The MySQL table, for importing by hand |
| `run.ps1` | Local server on port 8000 |
| `deploy.mjs` | Uploads this folder to `/home/perthrel/sandgroper.net/<folder>` and creates its database |
| `data/` | Appears on first local run; holds the SQLite file, never uploaded |

## Rules the code already follows

- PDO prepared statements — no string-built SQL.
- `e()` escapes every printed value (`htmlspecialchars`, `ENT_QUOTES`).
- POST, then redirect: a refresh never repeats a write.
- Labels on every input; `aria-label` where text is a symbol.

## Deploying a copy

```
node deploy.mjs --apply --folder=my-new-app --db=my-new-app
```

`--folder` is required here, so a copy can never overwrite `notes` by accident.
The script creates the folder, the database, and the credentials, then tests the
live page by adding and deleting a record. Use `--force` only to redeploy over an
existing folder.

Credentials come from `~/.dsh/.env` (`CPANEL_USER`, `CPANEL_HOST`,
`CPANEL_TOKEN`). See the `deploy-cpanel` skill for the API quirks.

## What to change for a new app

1. Replace the notes logic in `index.php` and the table in `inc/db.php`.
2. Update `sql/schema.sql` to match.
3. Change `<title>` and the `<h1>`.
4. Keep `data/` out of the upload — the deploy script already excludes it.
