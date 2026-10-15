<?php
/**
 * POST /api/upload.php   (multipart/form-data)
 *   folder     uploads | company-expenses
 *   name       file name without extension, e.g. 1745300782123-482910233
 *   file       the image bytes (jpeg / png / webp)
 *   if_exists  overwrite (default) | skip   — migration uses "skip" so it can be re-run
 *
 * Response: { ok, key: "uploads/<name>.<ext>", url, ext, bytes, skipped }
 */

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

require_post();

$folder   = validate_folder((string) ($_POST['folder'] ?? ''));
$name     = validate_name((string) ($_POST['name'] ?? ''));
$ifExists = ($_POST['if_exists'] ?? 'overwrite') === 'skip' ? 'skip' : 'overwrite';
$maxBytes = (int) ($CONFIG['max_bytes'] ?? 15 * 1024 * 1024);

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'] ?? '')) {
    $code = $_FILES['file']['error'] ?? 'none';
    respond(400, ['ok' => false, 'error' => 'No file received (upload error: ' . $code . ')']);
}
$tmp  = $_FILES['file']['tmp_name'];
$size = (int) filesize($tmp);
if ($size <= 0 || $size > $maxBytes) {
    respond(413, ['ok' => false, 'error' => 'File is empty or larger than ' . $maxBytes . ' bytes']);
}

verify_signature($CONFIG, 'upload', $folder, $name, hash_file('sha256', $tmp));

// Trust the bytes, not the client-supplied type or name.
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp) ?: '';
if (!isset(MIME_TO_EXT[$mime]) || @getimagesize($tmp) === false) {
    respond(415, ['ok' => false, 'error' => 'Only JPEG, PNG or WebP images are accepted (got ' . $mime . ')']);
}
$ext = MIME_TO_EXT[$mime];

$dir = media_root() . '/' . $folder;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    respond(500, ['ok' => false, 'error' => 'Cannot create folder']);
}

$key    = $folder . '/' . $name . '.' . $ext;
$target = $dir . '/' . $name . '.' . $ext;
$url    = public_base_url($CONFIG) . '/' . $key;

if ($ifExists === 'skip' && existing_files($dir, $name)) {
    respond(200, ['ok' => true, 'skipped' => true, 'key' => $key, 'url' => $url, 'ext' => $ext, 'bytes' => $size]);
}

// Atomic write: move into a temp name in the same folder, then rename.
$partial = $dir . '/.' . $name . '.' . bin2hex(random_bytes(4)) . '.part';
if (!move_uploaded_file($tmp, $partial)) {
    respond(500, ['ok' => false, 'error' => 'Could not store file']);
}
chmod($partial, 0644);
if (!rename($partial, $target)) {
    @unlink($partial);
    respond(500, ['ok' => false, 'error' => 'Could not finalise file']);
}

respond(201, ['ok' => true, 'skipped' => false, 'key' => $key, 'url' => $url, 'ext' => $ext, 'bytes' => $size]);
