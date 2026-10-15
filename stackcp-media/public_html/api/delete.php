<?php
/**
 * POST /api/delete.php   (application/x-www-form-urlencoded)
 *   folder   uploads | company-expenses
 *   name     file name WITHOUT extension (all extensions for that name are removed)
 *
 * Response: { ok, deleted: <count> }   — deleting a missing file is not an error.
 */

declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

require_post();

$folder = validate_folder((string) ($_POST['folder'] ?? ''));
$name   = validate_name((string) ($_POST['name'] ?? ''));

verify_signature($CONFIG, 'delete', $folder, $name, '');

$deleted = 0;
foreach (existing_files(media_root() . '/' . $folder, $name) as $path) {
    if (@unlink($path)) {
        $deleted++;
    }
}

respond(200, ['ok' => true, 'deleted' => $deleted]);
