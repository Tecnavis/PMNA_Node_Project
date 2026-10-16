/** Full address for a stored image (file name, organised StackCP path or full URL). */
const BASE = String(import.meta.env.VITE_CLOUD_IMAGE || 'https://media.rsakerala.com/uploads/');
export const getImageUrl = (value: unknown): string => {
    const v = typeof value === 'string' ? value.trim() : '';
    if (!v) return '';
    if (/^https?:\/\//i.test(v) || v.startsWith('data:') || v.startsWith('blob:')) return v;
    return BASE.replace(/\/?$/, '/') + v.replace(/^\/+/, '');
};
