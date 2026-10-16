/**
 * TV monitoring screen.
 * An admin sets an 8-digit passcode; a TV logs in with it and gets a VIEW-ONLY token
 * that works only for GET /tv/live. Changing or turning off the passcode logs every TV out.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppSetting = require('../Model/appSetting');
const Booking = require('../Model/booking');
const ops = require('./operations');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const KEY = 'tvScreen';
const TV_TOKEN_DAYS = Number(process.env.TV_TOKEN_DAYS) || 30;

const getSetting = async () => (await AppSetting.findOne({ key: KEY }).lean())?.value || null;

// --- simple brute-force guard: 8 wrong tries per IP per 15 minutes
const attempts = new Map();
function tooMany(ip) {
    const now = Date.now();
    const a = attempts.get(ip) || { n: 0, since: now };
    if (now - a.since > 15 * 60000) { a.n = 0; a.since = now; }
    attempts.set(ip, a);
    return a.n >= 8;
}
const fail = (ip) => { const a = attempts.get(ip); if (a) a.n++; };

/** GET /tv/settings (admin site) */
exports.settings = asyncErrorHandler(async (req, res) => {
    const s = await getSetting();
    res.json({ success: true, enabled: !!s?.hash, updatedAt: s?.updatedAt || null, tokenDays: TV_TOKEN_DAYS });
});

/** PUT /tv/passcode { passcode } (Admin) */
exports.setPasscode = asyncErrorHandler(async (req, res) => {
    const passcode = String(req.body?.passcode || '');
    if (!/^\d{8}$/.test(passcode)) return res.status(400).json({ success: false, message: 'The passcode must be exactly 8 digits.' });
    if (/^(\d)\1{7}$/.test(passcode) || ['12345678', '87654321'].includes(passcode)) {
        return res.status(400).json({ success: false, message: 'That passcode is too easy to guess. Please choose another.' });
    }
    const prev = await getSetting();
    const value = { hash: await bcrypt.hash(passcode, 10), version: (prev?.version || 0) + 1, updatedAt: new Date() };
    await AppSetting.findOneAndUpdate({ key: KEY }, { $set: { value } }, { upsert: true });
    res.json({ success: true, message: 'TV passcode saved. TVs that were logged in need the new passcode.' });
});

/** DELETE /tv/passcode (Admin) — turn the TV screen off */
exports.disable = asyncErrorHandler(async (req, res) => {
    const prev = await getSetting();
    await AppSetting.findOneAndUpdate({ key: KEY }, { $set: { value: { hash: null, version: (prev?.version || 0) + 1, updatedAt: new Date() } } }, { upsert: true });
    res.json({ success: true, message: 'TV screen turned off.' });
});

/** POST /tv/login { passcode } */
exports.login = asyncErrorHandler(async (req, res) => {
    const ip = req.ip || 'x';
    if (tooMany(ip)) return res.status(429).json({ success: false, message: 'Too many wrong tries. Please wait 15 minutes.' });
    const s = await getSetting();
    if (!s?.hash) return res.status(403).json({ success: false, message: 'The TV screen is not turned on. Ask the admin to set a passcode.' });
    const passcode = String(req.body?.passcode || '');
    if (!/^\d{8}$/.test(passcode) || !(await bcrypt.compare(passcode, s.hash))) {
        fail(ip);
        return res.status(401).json({ success: false, code: 'TV_PASSCODE', message: 'Wrong passcode.' });
    }
    attempts.delete(ip);
    const token = jwt.sign({ role: 'TV', v: s.version }, process.env.JWT_SECRET, { expiresIn: `${TV_TOKEN_DAYS}d` });
    res.json({ success: true, token });
});

/** checks the TV token (and that the passcode wasn't changed since) */
exports.requireTv = async (req, res, next) => {
    try {
        const raw = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const t = jwt.verify(raw, process.env.JWT_SECRET);
        if (t?.role !== 'TV') throw new Error('not a TV token');
        const s = await getSetting();
        if (!s?.hash || s.version !== t.v) throw new Error('passcode changed');
        next();
    } catch (e) {
        res.status(401).json({ success: false, code: 'TV_LOGIN', message: 'Please enter the TV passcode again.' });
    }
};

/** run an existing ops handler and capture its JSON */
const capture = (handler, query = {}) => new Promise((resolve, reject) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve(b); return this; } };
    Promise.resolve(handler({ query, user: { role: 'TV' } }, res, reject)).catch(reject);
});

/** GET /tv/live — everything the TV shows */
exports.live = asyncErrorHandler(async (req, res) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const start = new Date(`${today}T00:00:00+05:30`);
    const [board, live, summary, approvals, activity, trend] = await Promise.all([
        capture(ops.board),
        capture(ops.live),
        capture(ops.summary),
        capture(ops.approvals),
        Booking.find({ _includeHidden: true, $or: [{ statusChangedAt: { $gte: start } }, { createdAt: { $gte: start } }] })
            .select('fileNumber status statusChangedAt createdAt customerName customerVehicleNumber driver provider showroom company dummyDriverName')
            .populate('driver', 'name').populate('provider', 'name').populate('showroom', 'name').populate('company', 'name')
            .sort({ statusChangedAt: -1, createdAt: -1 }).limit(60).lean(),
        capture(ops.trend, { days: 1 }),
    ]);

    // privacy on a wall screen: no phone numbers, short customer names
    const shortName = (n) => (n ? String(n).trim().split(/\s+/)[0] : '');
    const people = (live.people || []).map((p) => ({
        _id: p._id, type: p.type, name: p.name, online: p.online, busy: p.busy, gpsStale: p.gpsStale, minutesSinceSeen: p.minutesSinceSeen,
        activeCase: p.activeCases?.[0] ? { fileNumber: p.activeCases[0].fileNumber, status: p.activeCases[0].status } : null,
    }));
    const columns = (board.columns || []).map((c) => ({
        status: c.status,
        cases: (c.cases || []).map((k) => ({
            _id: k._id, fileNumber: k.fileNumber, status: k.status, minutesInStatus: k.minutesInStatus, delayed: k.delayed, unassigned: k.unassigned,
            vehicleNumber: k.vehicleNumber, customer: shortName(k.customerName), assignedTo: k.driver?.name || k.provider?.name || '',
            client: k.showroom || k.company || '', pickup: k.pickup?.address || '', dropoff: k.dropoff?.address || '',
        })),
    }));
    res.json({
        success: true,
        generatedAt: new Date(),
        totals: board.totals,
        today: { ...(summary.totals || {}), amount: trend.series?.[0]?.amount || 0 },
        fleet: live.counts,
        people,
        columns,
        approvals: { total: approvals.total || 0, queues: (approvals.queues || []).map((q) => ({ label: q.label, count: q.count })) },
        activity: activity.map((b) => ({
            _id: b._id,
            at: b.statusChangedAt && b.statusChangedAt >= start ? b.statusChangedAt : b.createdAt,
            fileNumber: b.fileNumber, status: b.status, isNew: b.createdAt >= start && (!b.statusChangedAt || Math.abs(b.statusChangedAt - b.createdAt) < 60000),
            vehicleNumber: b.customerVehicleNumber, assignedTo: b.driver?.name || b.provider?.name || b.dummyDriverName || '',
            client: b.showroom?.name || b.company?.name || '',
        })).sort((a, b) => new Date(b.at) - new Date(a.at)),
        perPerson: summary.perPerson || [],
    });
});
