# My first web app

A tiny notes app built with **PHP**. Nothing to install — PHP is already on this
computer, and the database (SQLite) is built into PHP.

## Run it

Double-click `run.cmd`, then open <http://127.0.0.1:8000>.

The `data/` folder appears on first run and holds `app.sqlite` — that single
file *is* your whole database. Delete it to start fresh.

## What's in here

| Path | What it does |
|---|---|
| `index.php` | The page: shows notes, adds one, deletes one |
| `assets/style.css` | All the styling, including dark mode |
| `inc/config.php` | Settings; SQLite locally, MySQL on the server |
| `inc/db.php` | Opens the database and creates the table |
| `inc/config.local.example.php` | Template for the server's database password |
| `inc/.htaccess` | Tells Apache to refuse direct requests for this folder |
| `sql/schema.sql` | The MySQL table, for importing by hand |
| `data/` | Created automatically; holds the SQLite file (local only) |
| `run.cmd` | Starts PHP's built-in web server |

The layout is deliberately the same here and on the server: `index.php` sits in
the folder the browser reaches, and `inc/` holds the code that shouldn't be
linked to. That way "works locally" means "works online".

## How a request works

1. Your browser asks for `/`.
2. `index.php` runs. If the form was submitted, it writes to the database,
   then redirects back to `/` (so refreshing doesn't add twice).
3. It reads all notes and prints them as HTML inside a loop.

## Changing it

Ask the agent for what you want, for example:

- "Add a title field and a search box"
- "Give each note a colour tag"
- "Make it a to-do list with done/not-done"
- "Turn this into a guestbook with names"

## Deploying to the server

The app is live at <https://sandgroper.net/notes/>. After any change:

```
node deploy.mjs --apply --force
```

- No `--apply` → dry run: prints the plan, changes nothing.
- No `--force` → refuses to touch a folder that already exists, as a guard
  against deploying over the wrong thing.
- `--folder=calc --db=calc` → deploys a different app to its own folder and
  database.

The script creates the folder, uploads `index.php`, `assets/`, and `inc/` (never
`data/`, `sql/`, `run.cmd`, or this README), creates the MariaDB database and
user, writes `inc/config.local.php` on the server only, then tests the live page
by adding and deleting a note.

Locally the app uses SQLite; on the server, MariaDB. Same code, different
settings — that is what `inc/config.php` is for.

Credentials come from `C:\Users\pjeaj\.dsh\.env` (`CPANEL_USER`, `CPANEL_HOST`,
`CPANEL_TOKEN`) and are never printed. To revoke access, delete the token in
cPanel → Security → Manage API Tokens.

If `inc/config.local.php` is ever lost, the database password is too: reset it
in cPanel → MySQL Databases (the user's password), then update that file.
