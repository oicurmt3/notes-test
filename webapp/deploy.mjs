#!/usr/bin/env node
/**
 * Deploy this app to cPanel over UAPI.
 *
 *   node deploy.mjs                 # dry run: show exactly what would happen
 *   node deploy.mjs --apply         # do it
 *   node deploy.mjs --apply --force # deploy even if the target folder exists
 *
 * Credentials come from %USERPROFILE%\.dsh\.env and are never printed.
 *
 * Why Node instead of curl: the sandbox's restricted Windows token can't use
 * Schannel (Windows TLS), so curl/PowerShell fail with SEC_E_NO_CREDENTIALS.
 * Node ships its own TLS stack.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const APP_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------- arguments ----------

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  })
);

const APPLY = args.has("apply");
const FORCE = args.has("force");
const FOLDER = args.get("folder") ?? "notes";
const DB_SHORT = args.get("db") ?? FOLDER;
const DOMAIN = args.get("domain") ?? "sandgroper.net";
const DOCROOT = args.get("docroot") ?? `/home/perthrel/${DOMAIN}`;
const TARGET_DIR = `${DOCROOT}/${FOLDER}`;

// ---------- credentials ----------

function readEnv() {
  const file = path.join(os.homedir(), ".dsh", ".env");
  const vars = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ["CPANEL_USER", "CPANEL_HOST", "CPANEL_TOKEN"]) {
    if (!vars[key]) throw new Error(`Missing ${key} in ${file}`);
  }
  return vars;
}

const env = readEnv();
const AUTH = { Authorization: `cpanel ${env.CPANEL_USER}:${env.CPANEL_TOKEN}` };
const BASE = `https://${env.CPANEL_HOST}:2083`;

// ---------- API helpers ----------

async function uapi(module, func, params = {}) {
  const url = new URL(`${BASE}/execute/${module}/${func}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: AUTH, signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`${module}::${func} HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== 1) {
    const why = (json.errors ?? ["unknown error"]).join("; ");
    throw new Error(`${module}::${func} failed: ${why}`);
  }
  return json.data;
}

/** UAPI has no mkdir or unlink, so folder changes are cPanel API 2 calls. */
async function api2(module, func, params = {}) {
  const url = new URL(`${BASE}/json-api/cpanel`);
  url.searchParams.set("cpanel_jsonapi_user", env.CPANEL_USER);
  url.searchParams.set("cpanel_jsonapi_apiversion", "2");
  url.searchParams.set("cpanel_jsonapi_module", module);
  url.searchParams.set("cpanel_jsonapi_func", func);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: AUTH, signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`${module}::${func} HTTP ${res.status}`);
  const json = await res.json();
  const result = json.cpanelresult ?? {};
  if (result.error) throw new Error(`${module}::${func} failed: ${result.error}`);
  return result.data;
}

async function remoteList(dir) {
  const rows = await uapi("Fileman", "list_files", { dir, types: "dir|file", include_hidden: 1 });
  return rows.map((r) => ({ name: r.file, type: r.type }));
}

const madeDirs = new Set();

/** mkdir -p below the document root; never create or check ancestors. */
async function ensureDir(absDir) {
  if (madeDirs.has(absDir)) return;
  if (!absDir.startsWith(`${DOCROOT}/`)) {
    madeDirs.add(absDir);
    return;
  }

  const rel = absDir.slice(DOCROOT.length + 1).split("/").filter(Boolean);
  let cur = DOCROOT;
  for (const part of rel) {
    cur = `${cur}/${part}`;
    if (madeDirs.has(cur)) continue;

    const parent = cur.slice(0, cur.lastIndexOf("/"));
    const listing = await remoteList(parent);
    if (!listing.some((r) => r.type === "dir" && r.name === part)) {
      try {
        await api2("Fileman", "mkdir", { dir: parent, name: part });
      } catch (err) {
        // Another deploy may have created it a moment ago; re-check.
        const again = await remoteList(parent);
        if (!again.some((r) => r.type === "dir" && r.name === part)) throw err;
      }
    }
    madeDirs.add(cur);
  }
  madeDirs.add(absDir);
}

async function uploadFile(dir, filename, bytes) {
  const form = new FormData();
  form.append("dir", dir);
  form.append("overwrite", "1");
  form.append("file-1", new Blob([bytes]), filename);
  const res = await fetch(`${BASE}/execute/Fileman/upload_files`, {
    method: "POST",
    headers: AUTH,
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  const json = await res.json();
  if (json.status !== 1) {
    throw new Error(`upload ${filename} failed: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  }
}

async function removePaths(paths) {
  // This Fileman build has no trash_files, so unlink each file individually.
  // (API 2 again — UAPI exposes no delete function here.)
  for (const p of paths) {
    await api2("Fileman", "fileop", { op: "unlink", sourcefiles: p });
  }
  return paths;
}

// ---------- what we ship ----------

// Paths keep their relative structure on the server: index.php at the web
// root, everything else inside assets/ and inc/.
const SHIP = ["index.php", "assets/style.css", "inc/db.php", "inc/config.php", "inc/.htaccess"];

// Files a previous flattened upload left in the app root. Their correct
// copies now live in subfolders, so the strays must go — especially the
// root .htaccess, which denies the whole folder.
const STALE_ROOT_FILES = [".htaccess", "config.local.php", "config.php", "db.php", "style.css"];

function localFiles() {
  return SHIP.map((rel) => {
    const abs = path.join(APP_DIR, rel);
    if (!fs.existsSync(abs)) throw new Error(`missing local file: ${rel}`);
    return { rel, relDir: path.posix.dirname(rel), bytes: fs.readFileSync(abs) };
  });
}

// ---------- main ----------

async function main() {
  const files = localFiles();
  const dbFull = `${env.CPANEL_USER}_${DB_SHORT}`;

  console.log(`\n  mode:    ${APPLY ? "APPLY (writes to the server)" : "dry run (no changes)"}`);
  console.log(`  target:  ${TARGET_DIR}`);
  console.log(`  url:     https://${DOMAIN}/${FOLDER}/`);
  console.log(`  db:      ${dbFull}\n`);

  const roots = await remoteList(DOCROOT);
  const exists = roots.some((r) => r.type === "dir" && r.name === FOLDER);
  console.log(`  target folder ${exists ? "exists" : "does not exist yet"}`);

  const dbs = await uapi("Mysql", "list_databases");
  const dbTaken = (dbs ?? []).some((d) => d.database === dbFull);
  console.log(`  database ${dbTaken ? "already exists" : "will be created"}`);

  if (exists && !FORCE) {
    console.log("\n  Folder exists — stopping so nothing is overwritten.");
    console.log("  Re-run with --force to deploy into it anyway.\n");
    process.exitCode = 2;
    return;
  }

  // Carry over an earlier config.local.php so an existing database keeps working.
  let carriedConfig = null;
  if (dbTaken) {
    for (const [dir, label] of [
      [`${TARGET_DIR}/inc`, "inc"],
      [TARGET_DIR, "root"],
    ]) {
      try {
        const existing = await uapi("Fileman", "get_file_content", { dir, file: "config.local.php" });
        carriedConfig = Buffer.from(String(existing.content), "utf8");
        console.log(`  reusing existing database settings (${label})`);
        break;
      } catch {
        // Try the next location.
      }
    }
    if (!carriedConfig) {
      console.log("  database exists but its config.local.php is missing (password unknown)");
    }
  }

  console.log("\n  files:");
  for (const f of files) {
    console.log(`    ${f.rel.padEnd(24)} ${String(f.bytes.length).padStart(7)} bytes`);
  }
  if (carriedConfig) console.log(`    inc/config.local.php      ${String(carriedConfig.length).padStart(7)} bytes (reused)`);

  if (!APPLY) {
    console.log("\n  dry run complete. Add --apply to perform these steps.\n");
    return;
  }

  // 1. folder
  await ensureDir(TARGET_DIR);
  if (!exists) console.log("\n  created folder");

  // 2. files, preserving directories
  for (const f of files) {
    const dir = f.relDir === "." ? TARGET_DIR : `${TARGET_DIR}/${f.relDir}`;
    if (f.relDir !== ".") await ensureDir(dir);
    await uploadFile(dir, path.basename(f.rel), f.bytes);
    console.log(`  uploaded ${f.rel}`);
  }

  // 3. database
  if (!dbTaken) {
    const password = crypto.randomBytes(18).toString("base64url");
    await uapi("Mysql", "create_database", { name: dbFull });
    await uapi("Mysql", "create_user", { name: dbFull, password });
    await uapi("Mysql", "set_privileges_on_database", {
      user: dbFull,
      database: dbFull,
      privileges: "ALL PRIVILEGES",
    });
    console.log(`  created database ${dbFull} and its user`);

    const cfg = `<?php
return [
    'driver' => 'mysql',
    'mysql' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'database' => '${dbFull}',
        'username' => '${dbFull}',
        'password' => '${password}',
        'charset'  => 'utf8mb4',
    ],
];
`;
    // Never leave the password on this computer: build it in memory, upload,
    // forget it.
    carriedConfig = Buffer.from(cfg, "utf8");
  }

  if (carriedConfig) {
    await uploadFile(`${TARGET_DIR}/inc`, "config.local.php", carriedConfig);
    console.log("  uploaded inc/config.local.php");
  } else {
    console.log("  WARNING: no database credentials available; the page will not connect");
  }

  // 4. remove leftovers from the flattened first upload.
  // Dotfiles are invisible to list_files, so unlink them by name instead of
  // trusting a directory listing. Missing files are harmless no-ops.
  for (const name of STALE_ROOT_FILES) {
    try {
      await removePaths([`${TARGET_DIR}/${name}`]);
    } catch {
      // Not present — nothing to do.
    }
  }

  await verify();
}

// ---------- verification ----------

async function verify() {
  const url = `https://${DOMAIN}/${FOLDER}/`;
  const marker = "deploy-check";

  const page = await siteGet(url);
  console.log(`\n  GET ${url} -> ${page.status}`);

  const added = await sitePost(url, `action=add&body=${marker}`);
  console.log(`  POST add -> ${added.status}`);

  const after = await siteGet(url);
  const ok = after.body.includes(marker);
  console.log(`  note visible after add: ${ok}`);

  const id = after.body.match(/name="id" value="(\d+)"/)?.[1];
  if (id) {
    await sitePost(url, `action=delete&id=${id}`);
    const cleaned = await siteGet(url);
    console.log(`  test note removed: ${!cleaned.body.includes(marker)}`);
  }

  if (!ok) {
    const body = after.body.replace(/\s+/g, " ").slice(0, 300);
    console.log(`\n  page said: ${body}`);
    console.log("\n  Uploaded, but the page did not work — check inc/config.local.php.\n");
    process.exitCode = 1;
    return;
  }

  console.log("\n  Deployed and verified.\n");
}

async function siteGet(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  return { status: res.status, body: await res.text() };
}

async function sitePost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(30000),
  });
  return { status: res.status, body: await res.text() };
}

main().catch((err) => {
  console.error(`\n  FAILED: ${err.message}\n`);
  process.exitCode = 1;
});
