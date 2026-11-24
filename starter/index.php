<?php
declare(strict_types=1);

require __DIR__ . '/inc/db.php';

// Every form submits back to this same page, then the browser is
// redirected. That "POST then redirect" habit stops a page refresh
// from adding the same note twice.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'add') {
        $body = trim((string) ($_POST['body'] ?? ''));
        if ($body !== '') {
            $stmt = db()->prepare('INSERT INTO notes (body, created_at) VALUES (?, ?)');
            // Stored the same way in SQLite and MySQL, so date() works in both.
            $stmt->execute([$body, date('Y-m-d H:i:s')]);
        }
    } elseif ($action === 'delete') {
        $stmt = db()->prepare('DELETE FROM notes WHERE id = ?');
        $stmt->execute([(int) ($_POST['id'] ?? 0)]);
    }

    header('Location: ./');
    exit;
}

$notes = db()
    ->query('SELECT id, body, created_at FROM notes ORDER BY id DESC')
    ->fetchAll();

/** Escape text before printing it into HTML. Never skip this. */
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>My First Web App</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
<main class="card">
    <header>
        <h1>Notes</h1>
        <p class="hint">Your first working web app — try adding something.</p>
    </header>

    <form method="post" class="add">
        <input type="hidden" name="action" value="add">
        <label for="note-body" class="sr-only">Note text</label>
        <input
            type="text"
            id="note-body"
            name="body"
            placeholder="Write a note…"
            maxlength="500"
            required
            autofocus
        >
        <button type="submit">Add</button>
    </form>

    <?php if ($notes === []): ?>
        <p class="empty">Nothing here yet. Add your first note above.</p>
    <?php else: ?>
        <ul class="notes">
            <?php foreach ($notes as $note): ?>
                <li>
                    <span class="body"><?= e($note['body']) ?></span>
                    <time datetime="<?= e($note['created_at']) ?>">
                        <?= e(date('j M Y, H:i', strtotime($note['created_at']))) ?>
                    </time>
                    <form method="post" class="delete">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= (int) $note['id'] ?>">
                        <button type="submit" title="Delete note" aria-label="Delete note">&times;</button>
                    </form>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</main>
</body>
</html>
