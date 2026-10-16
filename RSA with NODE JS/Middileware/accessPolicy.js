/**
 * Central access policy — who may call admin-only actions.
 *
 * Runs before the routers. Requests that match no rule pass through untouched,
 * so everything the mobile apps use today keeps working exactly as before.
 *
 * Rule kinds:
 *   auth          any valid login token (adds a token check to routes that had none)
 *   roles         token role must be in the list
 *   self          allowed if the token's id equals the :id in the URL (driver/provider editing themselves)
 *
 * ACCESS_POLICY_MODE (env):
 *   enforce (default)  block with 401/403
 *   report             role rules only LOG "[access-policy] would block …" — use for the first days after
 *                      deploying, check the logs, then switch to enforce. Routes that had NO token check
 *                      at all (marked strict) are always enforced.
 */
const jwt = require('jsonwebtoken');

const ADMIN_SITE = ['Admin', 'Staff'];            // admin website users (admin login + staff login)
const ID = '[0-9a-fA-F]{24}';

/** [methods, path regex, rule] */
const RULES = [
    // ---- endpoints that had no token check at all (strict: always enforced) -----------------
    [['POST'], new RegExp(`^/marketing-executives/fix-passwords/?$`), { roles: ['Admin'], strict: true }],
    [['POST'], new RegExp(`^/provider/complete-settlement/${ID}/?$`), { roles: ADMIN_SITE, strict: true }],
    [['PUT'], new RegExp(`^/company/${ID}/?$`), { roles: ADMIN_SITE, strict: true }],
    [['PUT', 'DELETE'], new RegExp(`^/feedback/${ID}/?$`), { roles: ADMIN_SITE, strict: true }],
    [['GET'], new RegExp(`^/feedback(/${ID})?/?$`), { auth: true, strict: true }],
    [['PUT'], new RegExp(`^/vehicle/[^/]+/update-status/?$`), { roles: ADMIN_SITE, strict: true }],
    [['DELETE'], new RegExp(`^/booking/[^/]+/dropoff-images/all/?$`), { auth: true, strict: true }],
    [['POST'], new RegExp(`^/showroom/add-staff/?$`), { roles: [...ADMIN_SITE, 'Showroom'], strict: true }],
    [['PUT'], new RegExp(`^/showroom/update-staff/[^/]+/?$`), { roles: [...ADMIN_SITE, 'Showroom'], strict: true }],
    [['DELETE'], new RegExp(`^/showroom/[^/]+/staff-delete/[^/]+/?$`), { roles: [...ADMIN_SITE, 'Showroom'], strict: true }],

    // ---- master data: admin website only -----------------------------------------------------
    ...['baselocation', 'servicetype', 'role', 'petrol-pumps', 'staff', 'company'].flatMap((r) => [
        [['POST'], new RegExp(`^/${r}/?$`), { roles: ADMIN_SITE }],
        [['PUT', 'DELETE'], new RegExp(`^/${r}/${ID}/?$`), { roles: ADMIN_SITE }],
    ]),
    [['POST'], /^\/marketing-executives\/?$/, { roles: ADMIN_SITE }],
    [['PUT', 'DELETE'], new RegExp(`^/marketing-executives/${ID}/?$`), { roles: ADMIN_SITE }],

    // drivers / providers: admin creates + deletes; a driver/provider may still edit their own record
    [['POST'], /^\/driver\/?$/, { roles: ADMIN_SITE }],
    [['DELETE'], new RegExp(`^/driver/${ID}/?$`), { roles: ADMIN_SITE }],
    [['PUT'], new RegExp(`^/driver/(${ID})/?$`), { roles: ADMIN_SITE, self: true }],
    [['POST'], new RegExp(`^/driver/complete-settlement/${ID}/?$`), { roles: ADMIN_SITE }],
    [['POST'], /^\/provider\/?$/, { roles: ADMIN_SITE }],
    [['DELETE'], new RegExp(`^/provider/${ID}/?$`), { roles: ADMIN_SITE }],
    [['PUT'], new RegExp(`^/provider/(${ID})/?$`), { roles: ADMIN_SITE, self: true }],

    // showrooms: marketing executives add/edit showrooms; a showroom may edit itself
    [['POST'], /^\/showroom(\/create)?\/?$/, { roles: [...ADMIN_SITE, 'executive'] }],
    [['PUT'], new RegExp(`^/showroom/(${ID})/?$`), { roles: [...ADMIN_SITE, 'executive'], self: true }],
    [['DELETE'], new RegExp(`^/showroom/${ID}/?$`), { roles: ADMIN_SITE }],

    // rewards
    [['POST'], /^\/reward\/?$/, { roles: ADMIN_SITE }],
    [['PUT', 'DELETE'], new RegExp(`^/reward/${ID}/?$`), { roles: ADMIN_SITE }],
    [['PATCH'], /^\/reward\/(approve|reject)-redeem\/[^/]+\/?$/, { roles: ADMIN_SITE }],
    [['PATCH'], /^\/reward\/showroom-redeem\/[^/]+\/?$/, { roles: ADMIN_SITE }],
    [['PUT'], /^\/point(\/showroom)?\/?$/, { roles: ADMIN_SITE }],

    // vehicles & compliance papers
    [['POST'], /^\/vehicle\/?$/, { roles: ADMIN_SITE }],
    [['PUT', 'DELETE'], new RegExp(`^/vehicle/${ID}/?$`), { roles: ADMIN_SITE }],
    [['POST'], /^\/vehicle\/compliance-record\/?$/, { roles: ADMIN_SITE }],
    [['PUT', 'DELETE'], /^\/vehicle\/compliance-record\/[^/]+\/?$/, { roles: ADMIN_SITE }],
    [['PATCH'], /^\/vehicle\/compliance-record-dismiss\/?$/, { roles: ADMIN_SITE }],

    // money approvals & settlements done from the admin website
    [['POST', 'PUT', 'PATCH', 'DELETE'], /^\/company-expenses(\/.*)?$/, { roles: ADMIN_SITE }],
    [['PATCH'], /^\/expense\/update-expense\/[^/]+\/?$/, { roles: ADMIN_SITE }],
    [['PATCH'], /^\/expense\/complete-settlement\/[^/]+\/?$/, { roles: ADMIN_SITE }],
    [['PATCH'], /^\/diesel-expenses\/[^/]+\/approve\/?$/, { roles: ADMIN_SITE }],
    // NOTE: /booking/sattle-amount/:id is used by the driver & provider apps (cash settlement) — deliberately not restricted
    [['PATCH'], /^\/booking\/(sattle-amount-staff|settle-amount-company|settle-cash-pending|update-approve|accountantverify)\/[^/]+\/?$/, { roles: ADMIN_SITE }],
    [['PATCH'], /^\/booking\/(distribute-amount|settle-driver-balance-salary)\/?$/, { roles: ADMIN_SITE }],

    // admin tools
    [['POST'], /^\/archive\/.+$/, { roles: ADMIN_SITE }],
    [['GET'], /^\/archive\/.+$/, { roles: ADMIN_SITE }],
    [['POST', 'PUT', 'DELETE'], /^\/work\/(templates|generate-daily|generate-all-daily)(\/.*)?$/, { roles: ADMIN_SITE }],
    [['POST'], /^\/attendance\/admin-check-in\/[^/]+\/?$/, { roles: ADMIN_SITE }],
];

const roleOf = (user) => user?.user?.role || user?.role || null;
const idOf = (user) => String(user?.id || user?._id || user?.user?.id || '');

function readToken(req) {
    const header = req.header('Authorization');
    if (!header) return { error: 'Authorization token is missing' };
    try {
        const user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
        if (user && user.role === 'TV') return { error: 'Invalid token' }; // TV screen tokens only work on /tv/live
        if (user && user.role === 'Customer' && !String(req.originalUrl || '').startsWith('/customer/')) return { error: 'Invalid token' };
        return { user };
    } catch (err) {
        return { error: err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token' };
    }
}

function findRule(method, path) {
    for (const [methods, re, rule] of RULES) {
        if (!methods.includes(method)) continue;
        const m = path.match(re);
        if (m) return { rule, match: m };
    }
    return null;
}

function accessPolicy(req, res, next) {
    const found = findRule(req.method, req.path);
    if (!found) return next();
    const { rule, match } = found;
    const reportOnly = (process.env.ACCESS_POLICY_MODE || 'enforce').toLowerCase() === 'report' && !rule.strict;

    const { user, error } = readToken(req);
    if (error) {
        if (reportOnly) {
            console.warn(`[access-policy] would block (401 ${error}): ${req.method} ${req.originalUrl}`);
            return next();
        }
        return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: error });
    }
    req.user = req.user || user;
    if (rule.auth && !rule.roles) return next();

    const role = roleOf(user);
    const isSelf = rule.self && match[1] && idOf(user) === String(match[1]);
    if ((role && rule.roles.includes(role)) || isSelf) return next();

    if (reportOnly) {
        console.warn(`[access-policy] would block (403, role=${role || 'none'} id=${idOf(user)}): ${req.method} ${req.originalUrl}`);
        return next();
    }
    return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
}

module.exports = { accessPolicy, findRule, RULES, ADMIN_SITE };
