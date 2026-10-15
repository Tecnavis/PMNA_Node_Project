<?php
/**
 * Shared helpers for the RSA media API (upload.php / delete.php).
 *
 * Every request from the Node backend is signed with HMAC-SHA256:
 *   signature = hex(hmac_sha256(SECRET, "{timestamp}\n{action}\n{folder}\n{name}\n{fileSha256}"))
 * sent in the headers X-Media-Timestamp and X-Media-Signature.
 * fileSha256 is the hex SHA-256 of the uploaded bytes ('' for delete).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ---- Config -------------------------------------------------------------
// Preferred: media-config.php one level ABOVE the web root (not web-reachable).
// Fallback: config.php next to this file (blocked by api/.htaccess).
$configCandidates = [
    dirname(__DIR__, 2) . '/media-config.php',
    __DIR__ . '/config.php',
];
$CONFIG = null;
foreach ($configCandidates as $candidate) {
    if (is_file($candidate)) {
        $CONFIG = require $candidate;
        break;
    }
}
if (!is_array($CONFIG) || empty($CONFIG['secret']) || strlen($CONFIG['secret']) < 32) {
    respond(500, ['ok' => false, 'error' => 'Media API is not configured (secret missing or shorter than 32 chars)']);
}

// Top-level folders. Each must exist with its protective .htaccess (shipped in public_html/).
// Sub-folders below them are created on demand, e.g. bookings/2026/10/15/RSA-1234
const ALLOWED_FOLDERS = [
    'uploads', 'company-expenses',          // legacy (Cloudinary) + old-style uploads
    'bookings', 'expenses', 'diesel-expenses', 'profiles',
    'vehicles', 'verifications', 'rewards', 'admin',
];
const SEGMENT_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/';
const MAX_FOLDER_DEPTH = 7;
const MIME_TO_EXT = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];
const NAME_PATTERN = '/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/';
const SIGNATURE_WINDOW_SECONDS = 300;

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function media_root(): string
{
    // Folders live in the web root, next to /api
    return dirname(__DIR__);
}

function public_base_url(array $config): string
{
    if (!empty($config['public_base_url'])) {
        return rtrim($config['public_base_url'], '/');
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        respond(405, ['ok' => false, 'error' => 'POST only']);
    }
}

function validate_folder(string $folder): string
{
    $segments = explode('/', $folder);
    if (count($segments) > MAX_FOLDER_DEPTH || !in_array($segments[0], ALLOWED_FOLDERS, true)) {
        respond(400, ['ok' => false, 'error' => 'Invalid folder']);
    }
    foreach ($segments as $segment) {
        if (!preg_match(SEGMENT_PATTERN, $segment)) {
            respond(400, ['ok' => false, 'error' => 'Invalid folder']);
        }
    }
    // Never write into a top folder that lacks its no-script .htaccess
    if (!is_file(media_root() . '/' . $segments[0] . '/.htaccess')) {
        respond(500, ['ok' => false, 'error' => 'Folder "' . $segments[0] . '" is not set up on the media server']);
    }
    return $folder;
}

function validate_name(string $name): string
{
    if (!preg_match(NAME_PATTERN, $name)) {
        respond(400, ['ok' => false, 'error' => 'Invalid name']);
    }
    return $name;
}

function verify_signature(array $config, string $action, string $folder, string $name, string $fileSha256): void
{
    $ts  = $_SERVER['HTTP_X_MEDIA_TIMESTAMP'] ?? '';
    $sig = strtolower($_SERVER['HTTP_X_MEDIA_SIGNATURE'] ?? '');

    if (!ctype_digit($ts) || abs(time() - (int) $ts) > SIGNATURE_WINDOW_SECONDS) {
        respond(401, ['ok' => false, 'error' => 'Stale or missing timestamp']);
    }
    $payload  = $ts . "\n" . $action . "\n" . $folder . "\n" . $name . "\n" . $fileSha256;
    $expected = hash_hmac('sha256', $payload, $config['secret']);
    if (!hash_equals($expected, $sig)) {
        respond(401, ['ok' => false, 'error' => 'Bad signature']);
    }
}

/** Existing files for a name, any allowed extension (also the bare legacy name). */
function existing_files(string $dir, string $name): array
{
    $found = [];
    foreach (array_merge([''], array_map(fn($e) => '.' . $e, array_values(MIME_TO_EXT)), ['.jpeg']) as $suffix) {
        $path = $dir . '/' . $name . $suffix;
        if (is_file($path)) {
            $found[] = $path;
        }
    }
    return array_values(array_unique($found));
}
