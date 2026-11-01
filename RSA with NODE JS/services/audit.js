/**
 * Login history and staff activity log for the admin website.
 * Writes happen in the background and can never fail or slow down the request itself.
 */
const jwt = require('jsonwebtoken');

const clientIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket?.remoteAddress || '';

function device(ua = '') {
    const s = String(ua);
    const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Other';
    const os = /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iPhone/iPad' : /Windows/.test(s) ? 'Windows' : /Mac OS X/.test(s) ? 'Mac' : /Linux/.test(s) ? 'Linux' : 'Other';
    return `${browser} on ${os}`;
}

function recordLogin(req, fields) {
    try {
        const LoginEvent = require('../Model/loginEvent');
        LoginEvent.create({ ...fields, login: String(fields.login || '').slice(0, 120), ip: clientIp(req), device: device(req.headers['user-agent']) }).catch((e) => console.error('[audit] login', e.message));
    } catch (e) {
        console.error('[audit] login', e.message);
    }
}

const ID = /[0-9a-fA-F]{24}/;
// [methods, regex, readable action, category] — first match wins
const LABELS = [
    [['POST'], /^\/booking\/?$/, 'Created a booking', 'booking'],
    [['PATCH'], /^\/booking\/cancel\//, 'Cancelled a booking', 'booking'],
    [['PATCH'], /^\/booking\/verifybooking\//, 'Verified a booking', 'booking'],
    [['PATCH'], /^\/booking\/accountantverify\//, 'Accountant-verified a booking', 'money'],
    [['PATCH'], /^\/booking\/update-approve\//, 'Approved a booking', 'booking'],
    [['PUT'], /^\/booking\/postfeedback\//, 'Saved booking feedback', 'booking'],
    [['PATCH'], /^\/booking\/(sattle-amount|sattle-amount-staff|settle-amount-company|settle-amount-driver|settle-cash-pending)\//, 'Settled cash for a booking', 'money'],
    [['PATCH'], /^\/booking\/(distribute-amount|settle-driver-balance-salary)/, 'Distributed / settled amounts', 'money'],
    [['PATCH'], /^\/booking\/updatefilenumber\//, 'Changed a file number', 'booking'],
    [['PUT', 'PATCH'], /^\/booking\//, 'Edited a booking', 'booking'],
    [['DELETE'], /^\/booking\//, 'Removed booking photos', 'delete'],
    [['POST', 'PUT', 'PATCH', 'DELETE'], /^\/(cash-received-details|cash-received-details-staff|cash-collection-details|advance-payment|showroom-payments)/, 'Recorded a payment', 'money'],
    [['PATCH'], /^\/expense\/update-expense\//, 'Approved / rejected an expense', 'money'],
    [['PATCH'], /^\/expense\/complete-settlement\//, 'Settled driver expenses', 'money'],
    [['PATCH'], /^\/diesel-expenses\/[^/]+\/approve/, 'Approved a diesel expense', 'money'],
    [['POST', 'PUT', 'PATCH', 'DELETE'], /^\/company-expenses/, 'Changed a company expense', 'money'],
    [['DELETE'], /^\/(driver|provider|staff|company|showroom|vehicle|reward|servicetype|serviceType|baselocation|petrol-pumps|expense|marketing-executives)\b/, 'Deleted a record', 'delete'],
    [['POST', 'PUT'], /^\/(driver|provider)\b/, 'Added / edited a driver or provider', 'people'],
    [['POST', 'PUT'], /^\/staff\b/, 'Added / edited staff', 'people'],
    [['PUT'], /^\/permissions\//, 'Changed staff permissions', 'settings'],
    [['POST', 'PUT', 'PATCH'], /^\/(company|showroom|servicetype|serviceType|baselocation|petrol-pumps|vehicle|reward|point|marketing-executives|role)\b/, 'Changed settings / master data', 'settings'],
    [['POST', 'DELETE'], /^\/booking-tools\/[^/]+\/tracking-links/, 'Shared / switched off a tracking link', 'booking'],
    [['POST'], /^\/booking-tools\/[^/]+\/reassign-approval/, 'Decided a dispatch suggestion', 'booking'],
];
const SKIP = [/^\/(staff|admin)\/login/, /^\/reminders/, /^\/me\//, /^\/tv\//, /^\/whatsapp/, /^\/t\//];

const labelFor = (method, path) => {
    const hit = LABELS.find(([m, re]) => m.includes(method) && re.test(path));
    if (hit) return { action: hit[2], category: hit[3] };
    return { action: `${method === 'DELETE' ? 'Deleted' : method === 'POST' ? 'Added' : 'Changed'} ${path.split('/')[1] || 'item'}`, category: method === 'DELETE' ? 'delete' : 'other' };
};

/** Express middleware: log saving requests made by admin / staff logins. */
function activityLogger(req, res, next) {
    try {
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
        const path = req.path || '';
        if (SKIP.some((re) => re.test(path))) return next();
        const header = req.header('Authorization');
        if (!header) return next();
        let d;
        try {
            d = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
        } catch {
            return next();
        }
        const role = d?.role || d?.user?.role;
        if (role !== 'Admin' && role !== 'Staff') return next();
        const started = Date.now();
        res.on('finish', () => {
            try {
                const { action, category } = labelFor(req.method, path);
                const ActivityLog = require('../Model/activityLog');
                ActivityLog.create({
                    actor: { role, id: d.id ? String(d.id) : '', name: d.name || d.user?.name || '' },
                    method: req.method,
                    path: path.slice(0, 200),
                    action,
                    category,
                    targetId: (path.match(ID) || [])[0] || '',
                    status: res.statusCode,
                    ok: res.statusCode < 400,
                    ip: clientIp(req),
                    device: device(req.headers['user-agent']),
                    at: new Date(started),
                }).catch((e) => console.error('[audit] activity', e.message));
            } catch (e) {
                console.error('[audit] activity', e.message);
            }
        });
    } catch (e) {
        console.error('[audit]', e.message);
    }
    return next();
}

module.exports = { recordLogin, activityLogger, labelFor, device, clientIp };
