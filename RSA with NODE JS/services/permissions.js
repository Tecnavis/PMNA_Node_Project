/**
 * Staff permissions (admin website).
 *
 * Each Role, and each Staff member, can store { '<key>': true | false }.
 * The staff member's own setting wins over the role's; a key nobody has set keeps today's behaviour.
 * The admin login always has every permission.
 *
 * Page keys (e.g. 'page:/users/driver') are used by the website menu and page guard.
 * Action keys (below) are also enforced on the server by Middileware/staffPermissions.js.
 */
const mongoose = require('mongoose');

const ACTIONS = {
    'booking.create': 'Create bookings',
    'booking.edit': 'Edit bookings (details, driver, photos, file number)',
    'booking.cancel': 'Cancel bookings',
    'booking.verify': 'Verify bookings and feedback',
    'booking.accountVerify': 'Accountant verification',
    'cash.settle': 'Settle and record cash / payments',
    'expense.approve': 'Approve or settle expenses',
    'people.manage': 'Add, edit or delete drivers and providers',
    'staff.manage': 'Add, edit or delete staff',
    'masterdata.manage': 'Edit companies, showrooms, service types, base locations, petrol pumps, vehicles, rewards',
    'tracking.share': 'Share live tracking links with customers',
    'dispatch.approve': 'Approve dispatch suggestions',
    'executives.assign': 'Give showrooms and tasks to marketing executives',
};

const isKey = (k) => typeof k === 'string' && k.length <= 120 && (Object.prototype.hasOwnProperty.call(ACTIONS, k) || /^page:\/[A-Za-z0-9/_-]*$/.test(k));

/** Keep only known keys with true/false values. */
function clean(input) {
    const out = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    for (const [k, v] of Object.entries(input)) {
        if (isKey(k) && typeof v === 'boolean') out[k] = v;
    }
    return out;
}

// short cache so every request doesn't hit the database
const cache = new Map(); // staffId -> { at, value }
const TTL = 30 * 1000;
const forget = (staffId) => (staffId ? cache.delete(String(staffId)) : cache.clear());

/** { role: { _id, name }, role permissions, staff permissions, merged } for a staff member. */
async function forStaff(staffId) {
    const key = String(staffId || '');
    if (!mongoose.Types.ObjectId.isValid(key)) return null;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    const Staff = require('../Model/staff');
    const s = await Staff.findById(key).select('name role permissions').populate('role', 'name permissions').lean();
    const value = s
        ? {
              staffId: key,
              name: s.name,
              role: s.role ? { _id: s.role._id, name: s.role.name } : null,
              rolePermissions: clean(s.role?.permissions),
              staffPermissions: clean(s.permissions),
          }
        : null;
    if (value) value.merged = { ...value.rolePermissions, ...value.staffPermissions };
    cache.set(key, { at: Date.now(), value });
    return value;
}

module.exports = { ACTIONS, clean, isKey, forStaff, forget };
