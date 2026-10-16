/**
 * Media storage on StackCP (replaces Cloudinary).
 *
 * Files are pushed to a small signed PHP endpoint on the media subdomain
 * (see /stackcp-media in the repo) and served from there as static files.
 *
 * Env:
 *   MEDIA_API_URL     https://media.rsakerala.com/api
 *   MEDIA_PUBLIC_URL  https://media.rsakerala.com
 *   MEDIA_SECRET      same 64-hex secret as media-config.php on StackCP
 *   MEDIA_TIMEOUT_MS  optional, default 30000
 */
const crypto = require('crypto');

// Top-level folders on StackCP (must match api/_bootstrap.php). Sub-folders are allowed below them.
const ALLOWED_FOLDERS = [
    'uploads', 'company-expenses',
    'bookings', 'expenses', 'diesel-expenses', 'profiles',
    'vehicles', 'verifications', 'rewards', 'admin',
];
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const MAX_FOLDER_DEPTH = 7;

function isValidFolder(folder) {
    if (typeof folder !== 'string') return false;
    const segments = folder.split('/');
    return segments.length <= MAX_FOLDER_DEPTH
        && ALLOWED_FOLDERS.includes(segments[0])
        && segments.every(s => SEGMENT_RE.test(s));
}
const KNOWN_EXT_RE = /\.(jpe?g|png|webp)$/i;

class MediaStorageError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.name = 'MediaStorageError';
        this.statusCode = statusCode;
        this.errorCode = 'MEDIA_STORAGE_ERROR';
    }
}

function getConfig() {
    const apiUrl = (process.env.MEDIA_API_URL || '').replace(/\/+$/, '');
    const publicUrl = (process.env.MEDIA_PUBLIC_URL || '').replace(/\/+$/, '');
    const secret = process.env.MEDIA_SECRET || '';
    if (!apiUrl || !publicUrl || secret.length < 32) {
        throw new MediaStorageError(
            'Media storage is not configured (MEDIA_API_URL, MEDIA_PUBLIC_URL, MEDIA_SECRET)',
            500
        );
    }
    return { apiUrl, publicUrl, secret, timeoutMs: Number(process.env.MEDIA_TIMEOUT_MS || 30000) };
}

function sign(secret, action, folder, name, fileSha256 = '') {
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = `${ts}\n${action}\n${folder}\n${name}\n${fileSha256}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return { 'X-Media-Timestamp': ts, 'X-Media-Signature': signature };
}

function assertTarget(folder, name) {
    if (!isValidFolder(folder)) throw new MediaStorageError(`Invalid media folder: ${folder}`, 400);
    if (!NAME_RE.test(name)) throw new MediaStorageError(`Invalid media name: ${name}`, 400);
}

async function postWithRetry(url, buildInit, { retries = 2, timeoutMs }) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // buildInit is called per attempt: signatures carry a timestamp and bodies can't be reused.
            const res = await fetch(url, { ...buildInit(), signal: AbortSignal.timeout(timeoutMs) });
            const text = await res.text();
            let body;
            try { body = JSON.parse(text); } catch { body = { ok: false, error: text.slice(0, 200) }; }

            if (res.ok && body.ok) return body;
            // 4xx means the request itself is wrong — retrying won't help.
            if (res.status >= 400 && res.status < 500) {
                const rejected = new MediaStorageError(`Media server rejected request (${res.status}): ${body.error}`, res.status === 413 ? 413 : 502);
                rejected.noRetry = true;
                throw rejected;
            }
            lastError = new MediaStorageError(`Media server error (${res.status}): ${body.error}`);
        } catch (err) {
            if (err.noRetry) throw err;
            lastError = err instanceof MediaStorageError ? err : new MediaStorageError(`Media server unreachable: ${err.message}${err.cause ? ` (${err.cause.code || err.cause.message})` : ""}`);
        }
        if (attempt < retries) await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
    }
    throw lastError;
}

/**
 * Upload an image buffer.
 * @returns {Promise<{key: string, url: string, ext: string, bytes: number, skipped: boolean}>}
 */
async function uploadBuffer(buffer, { folder = 'uploads', name, mimetype = 'application/octet-stream', ifExists = 'overwrite' }) {
    const cfg = getConfig();
    assertTarget(folder, name);
    const sha = crypto.createHash('sha256').update(buffer).digest('hex');

    return postWithRetry(`${cfg.apiUrl}/upload.php`, () => {
        const form = new FormData();
        form.append('folder', folder);
        form.append('name', name);
        form.append('if_exists', ifExists);
        form.append('file', new Blob([buffer], { type: mimetype }), `${name}`);
        return { method: 'POST', headers: sign(cfg.secret, 'upload', folder, name, sha), body: form };
    }, { timeoutMs: cfg.timeoutMs });
}

/** Delete every extension variant of folder/name. Missing files are not an error. */
async function deleteObject(folder, name) {
    const cfg = getConfig();
    assertTarget(folder, name);
    return postWithRetry(`${cfg.apiUrl}/delete.php`, () => ({
        method: 'POST',
        headers: { ...sign(cfg.secret, 'delete', folder, name), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ folder, name }).toString(),
    }), { timeoutMs: cfg.timeoutMs });
}

/**
 * Work out folder + name from anything the DB may hold:
 *   "1745300782123-482910233"                       (legacy bare ID)
 *   "1745300782123-482910233.jpg"                   (new uploads)
 *   "company-expenses/abc123"                       (legacy company expense public_id)
 *   "bookings/2026/10/15/RSA-1234/pickup-....jpg"   (organised uploads)
 *   "https://media.rsakerala.com/uploads/x.jpg"     (new full URL)
 *   "https://res.cloudinary.com/<cloud>/image/upload/v123/uploads/x.jpg" (legacy full URL)
 * Returns null when the value isn't something we manage.
 */
function parseStoredValue(value) {
    if (!value || typeof value !== 'string') return null;
    let path = value.trim();

    if (/^https?:\/\//i.test(path)) {
        let url;
        try { url = new URL(path); } catch { return null; }
        const segments = url.pathname.split('/').filter(Boolean);
        if (url.hostname === 'res.cloudinary.com') {
            const uploadIdx = segments.indexOf('upload');
            if (uploadIdx === -1) return null;
            let rest = segments.slice(uploadIdx + 1);
            const versionIdx = rest.findIndex(s => /^v\d+$/.test(s));
            if (versionIdx !== -1) rest = rest.slice(versionIdx + 1);
            path = rest.join('/');
        } else {
            // Strip the media base path, e.g. https://tecnavis.in/rsa-media/uploads/x.jpg → uploads/x.jpg
            const basePath = (() => {
                try { return new URL(process.env.MEDIA_PUBLIC_URL || '').pathname.split('/').filter(Boolean); } catch { return []; }
            })();
            const startsWithBase = basePath.length && basePath.every((seg, i) => segments[i] === seg);
            path = (startsWithBase ? segments.slice(basePath.length) : segments).join('/');
        }
    }

    let parts = path.split('/').filter(Boolean);
    // ".../uploads/bookings/..." (app-style URL) is the same file as "bookings/..."
    if (parts[0] === 'uploads' && parts.length > 2 && ALLOWED_FOLDERS.includes(parts[1])) parts = parts.slice(1);
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'uploads';
    const name = (parts[parts.length - 1] || '').replace(KNOWN_EXT_RE, '');
    if (!isValidFolder(folder) || !NAME_RE.test(name)) return null;
    return { folder, name };
}

/** Best-effort delete for a stored DB value. Never throws. */
async function deleteStoredImage(value) {
    const target = parseStoredValue(value);
    if (!target) return false;
    try {
        await deleteObject(target.folder, target.name);
        return true;
    } catch (err) {
        console.error(`Media delete failed for "${value}":`, err.message);
        return false;
    }
}

function publicUrlFor(key) {
    return `${getConfig().publicUrl}/${key.replace(/^\/+/, '')}`;
}

module.exports = {
    uploadBuffer,
    deleteObject,
    deleteStoredImage,
    parseStoredValue,
    publicUrlFor,
    MediaStorageError,
    ALLOWED_FOLDERS,
    isValidFolder,
};