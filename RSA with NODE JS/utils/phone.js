/**
 * The ways one Indian mobile number may be saved: "9876543210", "+919876543210", "919876543210", "09876543210".
 * Used for lookups only; nothing stored is changed.
 */
exports.phoneVariants = (input) => {
    const raw = String(input ?? '').trim();
    const d = raw.replace(/\D/g, '').slice(-10);
    const set = new Set([raw]);
    if (d.length === 10) ['', '+91', '91', '0', '+91 '].forEach((p) => set.add(p + d));
    return [...set].filter(Boolean);
};
exports.last10 = (input) => String(input ?? '').replace(/\D/g, '').slice(-10);
