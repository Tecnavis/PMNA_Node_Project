<?php
/**
 * Private data backups for the RSA backend. Files are kept OUTSIDE the web folder
 * (../../rsa-backups next to public_html), so they can never be opened by URL.
 *
 * POST /api/backup.php   (all signed like upload.php; "name" is the set id, e.g. 2026-11-01-0315)
 *   action=put   set, file (name of the file inside the set), file upload  → stores the file
 *   action=list                                                            → { sets: [{ set, files:[{name,bytes}], at }] }
 *   action=get   set, file                                                 → the file bytes
 *   action=prune keep (number of newest sets to keep, min 3)               → deletes older sets
 *
 * Signature payload: "{ts}\nbackup-{action}\nbackups\n{set}/{file}\n{sha256 of upload or ''}"
 */
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_post();

const SET_PATTERN = '/^\d{4}-\d{2}-\d{2}-\d{4}(-[a-z0-9]{1,16})?$/';
const FILE_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}\.(json\.gz|xlsx)$/';

$root = dirname(__DIR__, 2) . '/rsa-backups';
if (!is_dir($root) && !mkdir($root, 0700, true) && !is_dir($root)) {
    respond(500, ['ok' => false, 'error' => 'Cannot create the backup folder']);
}

$action = (string) ($_POST['action'] ?? '');
$set = (string) ($_POST['set'] ?? '');
$file = (string) ($_POST['file'] ?? '');

if ($action === 'list') {
    verify_signature($CONFIG, 'backup-list', 'backups', '', '');
    $sets = [];
    foreach (glob($root . '/*', GLOB_ONLYDIR) ?: [] as $dir) {
        $files = [];
        foreach (glob($dir . '/*') ?: [] as $f) {
            if (is_file($f)) $files[] = ['name' => basename($f), 'bytes' => filesize($f)];
        }
        $sets[] = ['set' => basename($dir), 'files' => $files, 'at' => filemtime($dir)];
    }
    usort($sets, fn($a, $b) => strcmp($b['set'], $a['set']));
    respond(200, ['ok' => true, 'sets' => $sets]);
}

if ($action === 'prune') {
    verify_signature($CONFIG, 'backup-prune', 'backups', '', '');
    $keep = max(3, (int) ($_POST['keep'] ?? 12));
    $dirs = glob($root . '/*', GLOB_ONLYDIR) ?: [];
    rsort($dirs);
    $removed = [];
    foreach (array_slice($dirs, $keep) as $dir) {
        if (!preg_match(SET_PATTERN, basename($dir))) continue;
        foreach (glob($dir . '/*') ?: [] as $f) @unlink($f);
        @rmdir($dir);
        $removed[] = basename($dir);
    }
    respond(200, ['ok' => true, 'removed' => $removed]);
}

if (!preg_match(SET_PATTERN, $set) || !preg_match(FILE_PATTERN, $file)) {
    respond(400, ['ok' => false, 'error' => 'Invalid backup name']);
}
$dir = $root . '/' . $set;
$path = $dir . '/' . $file;

if ($action === 'put') {
    if (empty($_FILES['data']) || !is_uploaded_file($_FILES['data']['tmp_name'] ?? '')) {
        respond(400, ['ok' => false, 'error' => 'No file received (upload error: ' . ($_FILES['data']['error'] ?? 'none') . ')']);
    }
    $tmp = $_FILES['data']['tmp_name'];
    verify_signature($CONFIG, 'backup-put', 'backups', $set . '/' . $file, hash_file('sha256', $tmp));
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) respond(500, ['ok' => false, 'error' => 'Cannot create folder']);
    if (!move_uploaded_file($tmp, $path)) respond(500, ['ok' => false, 'error' => 'Could not store file']);
    chmod($path, 0600);
    respond(201, ['ok' => true, 'set' => $set, 'file' => $file, 'bytes' => filesize($path)]);
}

if ($action === 'get') {
    verify_signature($CONFIG, 'backup-get', 'backups', $set . '/' . $file, '');
    if (!is_file($path)) respond(404, ['ok' => false, 'error' => 'Not found']);
    header_remove('Content-Type');
    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: attachment; filename="' . $file . '"');
    readfile($path);
    exit;
}

respond(400, ['ok' => false, 'error' => 'Unknown action']);
