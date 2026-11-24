# Workspace notes

## What lives here

- `webapp/` — PHP notes app, live at <https://sandgroper.net/notes/>
- `starter/` — copy-per-project scaffold (same structure, required `--folder`)
- `webstack-preset/` — local DSH preset bundle ("Web Stack"), now the default
  preset for new sessions

## Starting a new app

```
Copy-Item -Recurse starter <name>
```

Then build in the copy and deploy it. Don't deploy `starter/` itself.

## Deploying `webapp/`

From `webapp/`:

```
node deploy.mjs --apply --force            # update the live app
node deploy.mjs --apply --folder=x --db=x  # new app, own folder + database
```

Dry run (no `--apply`) prints the plan and changes nothing. Detail lives in
`webapp/README.md`; the reusable procedure is the `deploy-cpanel` skill.

Server facts: cPanel user `perthrel`, API host
`s04dd.syd6.hostingplatform.net.au`, docroot `/home/perthrel/sandgroper.net`,
database `perthrel_notes` (MariaDB 11.4, PHP 8.4, LiteSpeed). Database
credentials exist only in `inc/config.local.php` on the server. The API token
lives in `%USERPROFILE%\.dsh\.env` as `CPANEL_*` — never print it, never paste
it into chat or a file in this workspace.

## Code rules for these apps

- PDO prepared statements; never interpolate input into SQL.
- Escape every printed value with `e()` (`htmlspecialchars`, `ENT_QUOTES`).
- POST, then redirect — a refresh must not repeat the write.
- Keep `inc/` out of reach (`.htaccess` denies it); never commit
  `config.local.php`.
- Local dev uses SQLite (`run.ps1`); the server uses MySQL via
  `inc/config.local.php`. Same code, different settings.

## Environment gotchas

- PowerShell and curl cannot do HTTPS in this sandbox (`SEC_E_NO_CREDENTIALS`
  from Schannel). Use Node for any HTTPS call.
- cPanel's modern UAPI has no folder create/delete; those are cPanel API 2.
- `list_files` hides dotfiles; never build cleanup logic from a listing.
