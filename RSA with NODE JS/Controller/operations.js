/**
 * Operations centre (admin website → "Operations").
 *
 *   GET /ops/live       drivers + providers with last GPS position, freshness and their open cases
 *   GET /ops/board      all open cases (incl. upcoming scheduled) with time-in-status and delay flags
 *   GET /ops/approvals  everything waiting for an admin decision, with counts and the latest items
 *   GET /ops/summary    today's numbers (India time) and per-driver counts
 *
 * Read-only: these endpoints never change data. Quick actions on the board use the existing
 * booking endpoints so all existing rules (notifications, amounts, …) still apply.
 */
const Booking = require('../Model/booking');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const Expense = require('../Model/expense');
const DieselExpense = require('../Model/dieselExpense');
const CompanyExpense = require('../Model/companyExpense');
const Redemption = require('../Model/redemption');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

// Workflow order (as used by the driver app and admin site)
const OPEN_STATUSES = [
    'Scheduled', 'Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location',
    'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped',
];
const FINAL_STATUSES = ['Order Completed', 'Cancelled', 'Rejected'];

// Minutes a case may sit in a status before it is flagged as delayed.
// Override with OPS_DELAY_MINUTES='{"Booking Added":10,"Vehicle Picked":45}'
const DEFAULT_DELAY_MINUTES = {
    'Booking Added': 15,
    'called to customer': 20,
    'Order Received': 30,
    'On the way to pickup location': 90,
    'Vehicle Picked': 60,
    'Vehicle Confirmed': 60,
    'On the way to dropoff location': 240,
    'Vehicle Dropped': 120,
};
// A driver with an open case whose phone hasn't reported GPS for this long is flagged
const GPS_STALE_MINUTES = Number(process.env.OPS_GPS_STALE_MINUTES || 30);
const ONLINE_MINUTES = Number(process.env.OPS_ONLINE_MINUTES || 15);

function delayLimits() {
    try { return { ...DEFAULT_DELAY_MINUTES, ...JSON.parse(process.env.OPS_DELAY_MINUTES || '{}') }; }
    catch { return DEFAULT_DELAY_MINUTES; }
}

const minutesSince = (d) => (d ? Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)) : null);

function parseLatLng(value) {
    if (!value || typeof value !== 'string') return null;
    const [lat, lng] = value.split(',').map((x) => parseFloat(String(x).trim()));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
}

/** India-time day boundaries */
function istDay(dateStr) {
    const d = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? dateStr
        : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const start = new Date(`${d}T00:00:00+05:30`);
    return { date: d, start, end: new Date(start.getTime() + 86400000) };
}

const CASE_FIELDS = 'fileNumber status statusChangedAt updatedAt createdAt pickupDate location latitudeAndLongitude dropoffLocation '
    + 'dropoffLatitudeAndLongitude customerName mob1 customerVehicleNumber driver provider showroom company serviceType workType cashPending';

function shapeCase(b, limits) {
    const since = b.statusChangedAt || b.updatedAt || b.createdAt;
    const mins = minutesSince(since);
    const limit = limits[b.status];
    const unassigned = !b.driver && !b.provider;
    return {
        _id: b._id,
        fileNumber: b.fileNumber || '',
        status: b.status,
        minutesInStatus: mins,
        statusSince: since,
        delayed: Boolean(limit && mins !== null && mins > limit),
        delayLimit: limit || null,
        unassigned,
        scheduledFor: b.status === 'Scheduled' || (b.pickupDate && new Date(b.pickupDate) > new Date()) ? b.pickupDate : null,
        customerName: b.customerName || '',
        customerPhone: b.mob1 || '',
        vehicleNumber: b.customerVehicleNumber || '',
        pickup: { address: b.location || '', point: parseLatLng(b.latitudeAndLongitude) },
        dropoff: { address: b.dropoffLocation || '', point: parseLatLng(b.dropoffLatitudeAndLongitude) },
        driver: b.driver ? { _id: b.driver._id || b.driver, name: b.driver.name, phone: b.driver.phone } : null,
        provider: b.provider ? { _id: b.provider._id || b.provider, name: b.provider.name, phone: b.provider.phone } : null,
        showroom: b.showroom?.name || null,
        company: b.company?.name || null,
        serviceType: b.serviceType?.serviceName || b.serviceType?.name || null,
        cashPending: Boolean(b.cashPending),
        createdAt: b.createdAt,
    };
}

async function loadOpenCases() {
    return Booking.find({ status: { $in: OPEN_STATUSES }, _includeHidden: true })
        .select(CASE_FIELDS)
        .populate('driver', 'name phone')
        .populate('provider', 'name phone')
        .populate('showroom', 'name')
        .populate('company', 'name')
        .populate('serviceType', 'serviceName name')
        .sort({ createdAt: -1 })
        .limit(Number(process.env.OPS_MAX_OPEN_CASES || 1000))
        .lean();
}

// ---------------------------------------------------------------- GET /ops/live
exports.live = asyncErrorHandler(async (req, res) => {
    const limits = delayLimits();
    const [drivers, providers, open] = await Promise.all([
        Driver.find({}).select('name phone image currentLocation locationUpdatedAt currentBookingStatus updatedAt').lean(),
        Provider.find({}).select('name phone companyName image currentLocation locationUpdatedAt currentBookingStatus updatedAt').lean(),
        loadOpenCases(),
    ]);
    const cases = open.map((b) => shapeCase(b, limits));

    const casesFor = (kind, id) => cases.filter((c) => c[kind] && String(c[kind]._id) === String(id) && c.status !== 'Scheduled');
    const person = (p, kind) => {
        const point = parseLatLng(p.currentLocation);
        // Older records have no locationUpdatedAt; fall back to updatedAt but mark as approximate
        const seenAt = p.locationUpdatedAt || (point ? p.updatedAt : null);
        const mins = minutesSince(seenAt);
        const active = casesFor(kind, p._id);
        return {
            _id: p._id,
            type: kind,
            name: p.name,
            phone: p.phone,
            company: p.companyName || null,
            image: p.image || null,
            point,
            lastSeenAt: seenAt,
            lastSeenApprox: !p.locationUpdatedAt,
            minutesSinceSeen: mins,
            online: mins !== null && mins <= ONLINE_MINUTES,
            gpsStale: active.length > 0 && (mins === null || mins > GPS_STALE_MINUTES),
            activeCases: active,
            busy: active.length > 0,
        };
    };

    const people = [...drivers.map((d) => person(d, 'driver')), ...providers.map((p) => person(p, 'provider'))];
    res.json({
        success: true,
        generatedAt: new Date(),
        settings: { gpsStaleMinutes: GPS_STALE_MINUTES, onlineMinutes: ONLINE_MINUTES },
        counts: {
            drivers: drivers.length,
            providers: providers.length,
            withLocation: people.filter((p) => p.point).length,
            online: people.filter((p) => p.online).length,
            busy: people.filter((p) => p.busy).length,
            gpsStale: people.filter((p) => p.gpsStale).length,
        },
        people,
        unassignedCases: cases.filter((c) => c.unassigned && c.status !== 'Scheduled'),
    });
});

// ---------------------------------------------------------------- GET /ops/board
exports.board = asyncErrorHandler(async (req, res) => {
    const limits = delayLimits();
    const cases = (await loadOpenCases()).map((b) => shapeCase(b, limits));
    const columns = OPEN_STATUSES.map((status) => ({
        status,
        delayLimit: limits[status] || null,
        cases: cases
            .filter((c) => c.status === status)
            .sort((a, b) => (b.minutesInStatus || 0) - (a.minutesInStatus || 0)),
    }));
    res.json({
        success: true,
        generatedAt: new Date(),
        statuses: OPEN_STATUSES,
        finalStatuses: FINAL_STATUSES,
        totals: {
            open: cases.filter((c) => c.status !== 'Scheduled').length,
            scheduled: cases.filter((c) => c.status === 'Scheduled').length,
            delayed: cases.filter((c) => c.delayed).length,
            unassigned: cases.filter((c) => c.unassigned && c.status !== 'Scheduled').length,
        },
        columns,
    });
});

// ---------------------------------------------------------------- GET /ops/approvals
exports.approvals = asyncErrorHandler(async (req, res) => {
    const take = 5;
    const queue = async (key, label, link, model, filter, select, populate, map) => {
        let q = model.find(filter).sort({ createdAt: -1 }).limit(take).select(select);
        if (populate) q = q.populate(populate[0], populate[1]);
        const [count, items] = await Promise.all([model.countDocuments(filter), q.lean()]);
        return { key, label, link, count, items: items.map(map) };
    };

    const queues = await Promise.all([
        queue('driverExpenses', 'Driver expenses', '/otherexpences', Expense,
            { approve: { $exists: false }, status: 'pending' }, 'amount description createdAt driver', ['driver', 'name'],
            (e) => ({ _id: e._id, title: e.driver?.name || 'Driver', detail: e.description || '', amount: e.amount, at: e.createdAt })),
        queue('dieselExpenses', 'Diesel expenses', '/dieselexpences', DieselExpense,
            { status: 'Pending' }, 'amount description vehicleNumber createdAt driver', ['driver', 'name'],
            (e) => ({ _id: e._id, title: e.driver?.name || 'Driver', detail: [e.vehicleNumber, e.description].filter(Boolean).join(' · '), amount: e.amount, at: e.createdAt })),
        queue('companyExpenses', 'Company expenses', '/companyexpences', CompanyExpense,
            { status: 'Pending' }, 'title amount category createdAt', null,
            (e) => ({ _id: e._id, title: e.title, detail: e.category || '', amount: e.amount, at: e.createdAt })),
        queue('redemptions', 'Reward redemptions', '/redeems', Redemption,
            { approval: false, rejected: { $ne: true } }, 'reward redeemByModel createdAt', ['reward', 'name'],
            (r) => ({ _id: r._id, title: r.reward?.name || 'Reward', detail: r.redeemByModel || '', at: r.createdAt })),
        queue('unverifiedBookings', 'Completed cases to verify', '/completedbookings', Booking,
            { status: 'Order Completed', verified: { $ne: true }, _includeHidden: true }, 'fileNumber customerName totalAmount updatedAt createdAt', null,
            (b) => ({ _id: b._id, title: b.fileNumber || 'Case', detail: b.customerName || '', amount: b.totalAmount, at: b.updatedAt || b.createdAt, link: `/openbooking/${b._id}` })),
        queue('cashPending', 'Cases with cash pending', '/bookings', Booking,
            { cashPending: true, _includeHidden: true }, 'fileNumber customerName totalAmount updatedAt createdAt', null,
            (b) => ({ _id: b._id, title: b.fileNumber || 'Case', detail: b.customerName || '', amount: b.totalAmount, at: b.updatedAt || b.createdAt, link: `/openbooking/${b._id}` })),
    ]);

    res.json({ success: true, generatedAt: new Date(), total: queues.reduce((s, q) => s + q.count, 0), queues });
});

// ---------------------------------------------------------------- GET /ops/summary
exports.summary = asyncErrorHandler(async (req, res) => {
    const { date, start, end } = istDay(req.query.date);
    const inDay = { $gte: start, $lt: end };
    const changedInDay = { $or: [{ statusChangedAt: inDay }, { statusChangedAt: { $exists: false }, updatedAt: inDay }] };

    const [created, completed, cancelled, openNow, scheduledUpcoming, perDriverRaw, cashPending] = await Promise.all([
        Booking.countDocuments({ createdAt: inDay, _includeHidden: true }),
        Booking.countDocuments({ status: 'Order Completed', ...changedInDay, _includeHidden: true }),
        Booking.countDocuments({ status: { $in: ['Cancelled', 'Rejected'] }, ...changedInDay, _includeHidden: true }),
        Booking.countDocuments({ status: { $in: OPEN_STATUSES.filter((s) => s !== 'Scheduled') }, _includeHidden: true }),
        Booking.countDocuments({ status: 'Scheduled', _includeHidden: true }),
        Booking.find({ createdAt: inDay, $or: [{ driver: { $ne: null } }, { provider: { $ne: null } }], _includeHidden: true })
            .select('status driver provider totalAmount')
            .populate('driver', 'name')
            .populate('provider', 'name')
            .lean(),
        Booking.countDocuments({ cashPending: true, _includeHidden: true }),
    ]);

    const perPerson = {};
    for (const b of perDriverRaw) {
        const who = b.driver || b.provider;
        if (!who) continue;
        const key = String(who._id);
        perPerson[key] = perPerson[key] || { _id: who._id, name: who.name || '—', type: b.driver ? 'driver' : 'provider', cases: 0, completed: 0, open: 0, amount: 0 };
        perPerson[key].cases++;
        if (b.status === 'Order Completed') perPerson[key].completed++;
        else if (!FINAL_STATUSES.includes(b.status)) perPerson[key].open++;
        perPerson[key].amount += Number(b.totalAmount) || 0;
    }

    res.json({
        success: true,
        date,
        totals: { created, completed, cancelled, openNow, scheduledUpcoming, cashPending },
        perPerson: Object.values(perPerson).sort((a, b) => b.cases - a.cases),
    });
});

/** GET /ops/trend?days=14 — bookings and amount per day (India time) for the dashboard chart */
exports.trend = asyncErrorHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 14, 1), 90);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const start = new Date(new Date(`${today}T00:00:00+05:30`).getTime() - (days - 1) * 86400000);
    const rows = await Booking.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
                count: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'Order Completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Rejected']] }, 1, 0] } },
                amount: { $sum: { $ifNull: ['$totalAmount', 0] } },
            },
        },
    ]);
    const byDay = Object.fromEntries(rows.map((r) => [r._id, r]));
    const series = [];
    for (let i = 0; i < days; i++) {
        const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(start.getTime() + i * 86400000 + 12 * 3600000));
        const r = byDay[d] || {};
        series.push({ day: d, count: r.count || 0, completed: r.completed || 0, cancelled: r.cancelled || 0, amount: r.amount || 0 });
    }
    res.json({ success: true, days, series });
});

exports._internals = { shapeCase, parseLatLng, istDay, OPEN_STATUSES, DEFAULT_DELAY_MINUTES };
