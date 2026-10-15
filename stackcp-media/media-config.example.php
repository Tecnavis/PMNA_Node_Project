<?php
/**
 * Save as ONE of these (fill in the values first):
 *   - api/config.php  inside the media folder          ← easiest; blocked from the web by api/.htaccess
 *   - media-config.php in the folder ABOVE the media folder
 * Do NOT leave it as media-config.php inside the media folder itself — it won't be found there.
 *
 * The same secret goes into the Node backend as MEDIA_SECRET.
 * Generate one with:  openssl rand -hex 32
 */
return [
    'secret'          => 'REPLACE_WITH_64_HEX_CHARS_FROM_openssl_rand_-hex_32',
    'public_base_url' => 'https://media.rsakerala.com',   // or e.g. 'https://tecnavis.in/rsa-media' if it's a sub-folder
    'max_bytes'       => 15 * 1024 * 1024,
];
