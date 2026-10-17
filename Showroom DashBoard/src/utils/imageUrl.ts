/**
 * Turns whatever the API stores for an image into a URL the browser can load.
 *
 * Formats that exist in the database:
 *   "1745300782123-482910233"                          legacy bare ID (no extension)          → Cloudinary or StackCP uploads/
 *   "1745300782123-482910233.jpg"                      bare file name                         → Cloudinary or StackCP uploads/
 *   "company-expenses/abc123"                          legacy company-expense public_id       → Cloudinary or StackCP
 *   "bookings/2026/10/15/RSA-1/pickup-….jpg"           organised StackCP key (new uploads)    → StackCP only
 *   "https://res.cloudinary.com/<cloud>/image/upload/…" legacy full URL
 *   "https://media.rsakerala.com/…"                    new full URL
 *
 * VITE_MEDIA_BASE_URL  StackCP media address. Set it once all old images are copied: then everything loads from StackCP.
 * VITE_CLOUD_IMAGE     old Cloudinary base, used for legacy names while VITE_MEDIA_BASE_URL is not set.
 *
 * During the move an image can be on only one of the two, so installImageFallback() retries a broken
 * image at the other address once.
 */
const MEDIA_BASE_SET = String(import.meta.env.VITE_MEDIA_BASE_URL || '').replace(/\/+$/, '');
const MEDIA = MEDIA_BASE_SET || 'https://media.rsakerala.com';
const LEGACY_BASE = String(import.meta.env.VITE_CLOUD_IMAGE || '');
/** "https://res.cloudinary.com/<cloud>/image/upload/" taken from VITE_CLOUD_IMAGE (version and folder dropped) */
const CLOUD_ROOT = (LEGACY_BASE.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/i) || [])[1] || '';

const MANAGED_FOLDERS = ['uploads', 'company-expenses', 'bookings', 'expenses', 'diesel-expenses', 'profiles', 'vehicles', 'verifications', 'rewards', 'admin'];
/** Folders that only ever existed on StackCP (created by the new upload code). */
const STACKCP_ONLY = MANAGED_FOLDERS.filter((f) => f !== 'uploads' && f !== 'company-expenses');

const firstSegment = (key: string) => key.split('/')[0];

/** Normalise a path after ".../image/upload/" to a storage key like "uploads/x.jpg". */
const keyFromCloudinaryPath = (path: string): string | null => {
    const segments = path.split('?')[0].split('/').filter(Boolean);
    const versionIndex = segments.findIndex((s) => /^v\d+$/.test(s));
    let parts = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
    // the old base already ends in "uploads/", so "uploads/<organised key>" or "uploads/uploads/x" can appear
    while (parts.length > 1 && parts[0] === 'uploads' && MANAGED_FOLDERS.includes(parts[1])) parts = parts.slice(1);
    const key = parts.join('/');
    return MANAGED_FOLDERS.includes(firstSegment(key)) ? key : null;
};

const cloudinaryKey = (url: string): string | null => {
    const match = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/i);
    return match ? keyFromCloudinaryPath(match[1]) : null;
};

const mediaKey = (url: string): string | null => {
    if (!url.toLowerCase().startsWith(MEDIA.toLowerCase() + '/')) return null;
    return url.slice(MEDIA.length + 1).split('?')[0] || null;
};

// Accepts unknown because some forms keep either a File (new pick) or the stored name in one state variable.
export const getImageUrl = (value?: unknown): string => {
    if (!value || typeof value !== 'string') return '';
    const v = value.trim();
    if (!v) return '';
    if (/^(data|blob):/i.test(v)) return v;

    if (/^https?:\/\//i.test(v)) {
        const key = cloudinaryKey(v);
        if (!key) return v;
        // a Cloudinary URL pointing at a StackCP-only folder can't exist on Cloudinary
        if (MEDIA_BASE_SET || STACKCP_ONLY.includes(firstSegment(key))) return `${MEDIA}/${key}`;
        return v;
    }

    const key = v.replace(/^\/+/, '');
    // New uploads ("bookings/…", "expenses/…") are only on StackCP — never build a Cloudinary address for them.
    if (STACKCP_ONLY.includes(firstSegment(key))) return `${MEDIA}/${key}`;

    if (!MEDIA_BASE_SET) {
        // Before the switch-over: same as the old `${CLOUD_IMAGE}${value}` code.
        return LEGACY_BASE ? `${LEGACY_BASE}${key}` : `${MEDIA}/${MANAGED_FOLDERS.includes(firstSegment(key)) ? key : `uploads/${key}`}`;
    }
    return MANAGED_FOLDERS.includes(firstSegment(key)) ? `${MEDIA}/${key}` : `${MEDIA}/uploads/${key}`;
};

/** The other place an image may be while the Cloudinary → StackCP copy is running (null if none). */
export const alternateImageUrl = (src: string): string | null => {
    if (!src) return null;
    const fromCloud = cloudinaryKey(src);
    if (fromCloud) return `${MEDIA}/${fromCloud}`;
    const fromMedia = mediaKey(src);
    if (fromMedia && CLOUD_ROOT && !STACKCP_ONLY.includes(firstSegment(fromMedia))) return `${CLOUD_ROOT}${fromMedia}`;
    return null;
};

let installed = false;
/** One listener for the whole app: a broken <img> is retried once at the alternate address. */
export const installImageFallback = () => {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    window.addEventListener(
        'error',
        (event) => {
            const img = event.target;
            if (!(img instanceof HTMLImageElement)) return;
            const src = img.currentSrc || img.src;
            if (!src || img.dataset.fallbackTo === src) return; // the fallback itself failed: stop
            const alt = alternateImageUrl(src);
            if (!alt || alt === src) return;
            img.dataset.fallbackTo = alt;
            img.src = alt;
        },
        true // image errors don't bubble; catch them on the way down
    );
};

export default getImageUrl;
