/**
 * Turns whatever the API stores for an image into a URL the browser can load.
 *
 * Handles every format that exists in the database:
 *   "1745300782123-482910233"                         legacy bare ID (no extension)
 *   "1745300782123-482910233.jpg"                     bare file name
 *   "company-expenses/abc123"                         legacy company-expense public_id
 *   "https://res.cloudinary.com/<cloud>/image/upload/v1/uploads/x.jpg"   legacy full URL
 *   "https://media.rsakerala.com/uploads/x.jpg"       new full URL
 *
 * VITE_MEDIA_BASE_URL  = https://media.rsakerala.com   (StackCP media subdomain)
 * VITE_CLOUD_IMAGE     = old Cloudinary base — only used while VITE_MEDIA_BASE_URL is not set,
 *                        so this file can be deployed before the migration.
 */
const MEDIA_BASE = String(import.meta.env.VITE_MEDIA_BASE_URL || '').replace(/\/+$/, '');
const LEGACY_BASE = String(import.meta.env.VITE_CLOUD_IMAGE || '');
const MANAGED_FOLDERS = [
    'uploads', 'company-expenses',
    'bookings', 'expenses', 'diesel-expenses', 'profiles', 'vehicles', 'verifications', 'rewards', 'admin',
];

/** "…/image/upload/v123/uploads/x.jpg" → "uploads/x.jpg" (null if not a Cloudinary image URL) */
const cloudinaryKey = (url: string): string | null => {
    const match = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/i);
    if (!match) return null;
    const segments = match[1].split('?')[0].split('/');
    const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s));
    const key = (versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments).join('/');
    return MANAGED_FOLDERS.includes(key.split('/')[0]) ? key : null;
};

// Accepts unknown because some forms keep either a File (new pick) or the stored name in one state variable.
export const getImageUrl = (value?: unknown): string => {
    if (!value || typeof value !== 'string') return '';
    const v = value.trim();
    if (!v) return '';
    if (/^(data|blob):/i.test(v)) return v;

    const isAbsolute = /^https?:\/\//i.test(v);

    // Before the switch-over: behave exactly like the old `${CLOUD_IMAGE}${value}` code.
    if (!MEDIA_BASE) {
        return isAbsolute ? v : `${LEGACY_BASE}${v.replace(/^\/+/, '')}`;
    }

    if (isAbsolute) {
        const key = cloudinaryKey(v);
        return key ? `${MEDIA_BASE}/${key}` : v;
    }

    const key = v.replace(/^\/+/, '');
    return MANAGED_FOLDERS.includes(key.split('/')[0]) ? `${MEDIA_BASE}/${key}` : `${MEDIA_BASE}/uploads/${key}`;
};

export default getImageUrl;
