/**
 * Server-side check of staff permissions (see services/permissions.js).
 * Only applies to admin-website STAFF logins, and only when an admin has switched the permission OFF
 * for that staff member or their role. Everyone else (admin, drivers, providers, showrooms, apps)
 * passes through exactly as before.
 */
const jwt = require('jsonwebtoken');
const permissions = require('../services/permissions');

const ID = '[0-9a-fA-F]{24}';
const any = (...parts) => new RegExp(`^/(${parts.join('|')})(/.*)?/?$`);

/** [methods, path regex, permission key] — first match wins */
const RULES = [
    [['POST'], /^\/booking\/?$/, 'booking.create'],
    [['PATCH'], new RegExp(`^/booking/cancel/${ID}/?$`), 'booking.cancel'],
    [['PATCH', 'PUT'], new RegExp(`^/booking/(verifybooking|update-approve|postfeedback)/${ID}/?$`), 'booking.verify'],
    [['PATCH'], new RegExp(`^/booking/accountantverify/${ID}/?$`), 'booking.accountVerify'],
    [['PATCH'], /^\/booking\/(sattle-amount|sattle-amount-staff|settle-amount-company|settle-amount-driver|settle-cash-pending)\/[^/]+\/?$/, 'cash.settle'],
    [['PATCH'], /^\/booking\/(distribute-amount|settle-driver-balance-salary)\/?$/, 'cash.settle'],
    [['POST', 'PUT', 'PATCH', 'DELETE'], any('cash-received-details', 'cash-received-details-staff', 'cash-collection-details', 'advance-payment', 'showroom-payments'), 'cash.settle'],
    [['PUT'], new RegExp(`^/booking/(${ID}|pickupbyadmin/${ID})/?$`), 'booking.edit'],
    [['PATCH', 'DELETE'], /^\/booking\/(updatefilenumber|inventory|pickupimage|dropoffimage|addingpickupimage|addingdropoffimage|removePickupImage|removeDropoffImage)\/.+$/, 'booking.edit'],
    [['PATCH'], /^\/expense\/(update-expense|complete-settlement)\/[^/]+\/?$/, 'expense.approve'],
    [['PATCH'], /^\/diesel-expenses\/[^/]+\/approve\/?$/, 'expense.approve'],
    [['POST', 'PUT', 'PATCH', 'DELETE'], any('company-expenses'), 'expense.approve'],
    [['POST', 'PUT', 'DELETE'], new RegExp(`^/(driver|provider)(/${ID})?/?$`), 'people.manage'],
    [['POST', 'PUT', 'DELETE'], new RegExp(`^/staff(/${ID})?/?$`), 'staff.manage'],
    [['POST', 'PUT', 'PATCH', 'DELETE'], any('company', 'showroom', 'servicetype', 'serviceType', 'baselocation', 'petrol-pumps', 'vehicle', 'reward'), 'masterdata.manage'],
    [['POST', 'DELETE'], /^\/booking-tools\/[^/]+\/tracking-links(\/[^/]+)?\/?$/, 'tracking.share'],
    [['POST'], /^\/booking-tools\/[^/]+\/reassign-approval\/?$/, 'dispatch.approve'],
    [['POST', 'PATCH', 'DELETE'], /^\/exec-tasks(\/.*)?$/, 'executives.assign'],
];
// paths that must never be blocked (logins)
const NEVER = [/^\/staff\/login\/?$/, /^\/admin\/login\/?$/, /^\/showroom\/(login|staff-login|verify-otp|send-otp)/];

const keyFor = (method, path) => {
    if (NEVER.some((re) => re.test(path))) return null;
    const hit = RULES.find(([methods, re]) => methods.includes(method) && re.test(path));
    return hit ? hit[2] : null;
};

async function staffPermissions(req, res, next) {
    try {
        const path = req.path || req.originalUrl.split('?')[0];
        const key = keyFor(req.method, path);
        if (!key) return next();
        const header = req.header('Authorization');
        if (!header) return next(); // the route's own login check answers
        let decoded;
        try {
            decoded = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
        } catch {
            return next();
        }
        if (decoded?.role !== 'Staff' || !decoded.id) return next();
        const p = await permissions.forStaff(decoded.id);
        if (p && p.merged[key] === false) {
            return res.status(403).json({ code: 'NO_PERMISSION', permission: key, message: `Your account is not allowed to: ${permissions.ACTIONS[key] || key}. Ask an admin to change your permissions.` });
        }
        return next();
    } catch (e) {
        console.error('[staffPermissions]', e.message);
        return next(); // never lock people out because of a bug here
    }
}

module.exports = { staffPermissions, keyFor, RULES };
