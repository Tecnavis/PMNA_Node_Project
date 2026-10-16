/**
 * Reports Centre (admin website): one place to filter bookings / expenses and export them.
 * Read-only. Dates are India time. Archived bookings are included when asked.
 */
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');
const Expense = require('../Model/expense');
const DieselExpense = require('../Model/dieselExpense');
const CompanyExpense = require('../Model/companyExpense');
const Company = require('../Model/company');
const Showroom = require('../Model/showroom');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const ServiceType = require('../Model/serviceType');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const MAX_ROWS = 10000;
const TZ = 'Asia/Kolkata';
const ALL_STATUSES = [
    'Scheduled', 'Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location',
    'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped',
    'Order Completed', 'Cancelled', 'Rejected',
];

const isId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);
const ids = (v) => String(v || '').split(',').map((x) => x.trim()).filter(isId).map((x) => new mongoose.Types.ObjectId(x));
const list = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** YYYY-MM-DD (India) → Date at the start of that day */
const dayStart = (d) => new Date(`${d}T00:00:00+05:30`);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const istDay = (d) => (d ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(d)) : '');

function dateRange(q) {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(q.from || '') ? q.from : today();
    const to = /^\d{4}-\d{2}-\d{2}$/.test(q.to || '') ? q.to : from;
    const start = dayStart(from);
    const end = new Date(dayStart(to).getTime() + 24 * 3600 * 1000);
    return { from, to, start, end };
}

function bookingFilter(q) {
    const { start, end } = dateRange(q);
    const dateField = q.dateField === 'pickupDate' ? 'pickupDate' : 'createdAt';
    const f = { [dateField]: { $gte: start, $lt: end } };

    const statuses = list(q.status).filter((s) => ALL_STATUSES.includes(s) || s === 'open');
    if (statuses.length) {
        const expanded = statuses.flatMap((s) => (s === 'open' ? ALL_STATUSES.slice(0, 9) : [s]));
        f.status = { $in: expanded };
    }
    if (q.workType) f.workType = q.workType;
    const map = { company: 'company', showroom: 'showroom', driver: 'driver', provider: 'provider', serviceType: 'serviceType', baselocation: 'baselocation' };
    for (const [param, field] of Object.entries(map)) {
        const v = ids(q[param]);
        if (v.length) f[field] = { $in: v };
    }
    if (q.bookedBy) f.bookedByModel = { $in: list(q.bookedBy) };
    if (q.verified === 'yes') f.verified = true;
    if (q.verified === 'no') f.verified = { $ne: true };
    if (q.cashPending === 'yes') f.cashPending = true;
    if (q.cashPending === 'no') f.cashPending = { $ne: true };
    if (q.payment === 'company') f.company = { ...(f.company || {}), $ne: null, $exists: true };
    if (q.payment === 'cash') f.$or = [{ company: null }, { company: { $exists: false } }];
    if (q.q && String(q.q).trim()) {
        const re = new RegExp(escapeRe(String(q.q).trim()), 'i');
        const or = [{ fileNumber: re }, { customerName: re }, { customerVehicleNumber: re }, { mob1: re }, { location: re }, { dropoffLocation: re }];
        f.$and = [...(f.$and || []), { $or: or }];
    }
    return { filter: f, dateField };
}

const POPULATE = [
    { path: 'company', select: 'name' },
    { path: 'showroom', select: 'name' },
    { path: 'driver', select: 'name' },
    { path: 'provider', select: 'name' },
    { path: 'serviceType', select: 'serviceName' },
    { path: 'baselocation', select: 'baseLocation' },
];
const BOOKING_FIELDS =
    'fileNumber createdAt pickupDate workType status customerName mob1 customerVehicleNumber vehicleType brandName location dropoffLocation ' +
    'totalDistence totalDriverDistence totalAmount receivedAmount partialAmount receivedAmountByCompany cashPending verified accountantVerified ' +
    'driverSalary bookedByModel bookedBy company showroom driver provider serviceType baselocation dummyDriverName dummyProviderName ' +
    'rewardAmount discountAmount insuranceAmount cancelReason invoiceNumber';

function flatten(b, archived) {
    const total = Number(b.totalAmount) || 0;
    const collected = b.company ? Number(b.receivedAmountByCompany) || 0 : Number(b.partialAmount) || Number(b.receivedAmount) || 0;
    return {
        _id: b._id,
        date: b.createdAt,
        day: istDay(b.createdAt),
        pickupDate: b.pickupDate || null,
        fileNumber: b.fileNumber || '',
        status: b.status || '',
        workType: b.workType || '',
        customerName: b.customerName || '',
        phone: b.mob1 || '',
        vehicleNumber: b.customerVehicleNumber || '',
        vehicle: [b.brandName, b.vehicleType].filter(Boolean).join(' '),
        serviceType: b.serviceType?.serviceName || '',
        company: b.company?.name || '',
        showroom: b.showroom?.name || '',
        assignedTo: b.driver?.name || b.provider?.name || b.dummyDriverName || b.dummyProviderName || '',
        assignedType: b.driver ? 'Driver' : b.provider ? 'Provider' : '',
        baseLocation: b.baselocation?.baseLocation || '',
        pickup: b.location || '',
        dropoff: b.dropoffLocation || '',
        km: Number(b.totalDistence) || 0,
        totalAmount: total,
        collected,
        balance: b.cashPending ? Math.max(total - collected, 0) : 0,
        cashPending: !!b.cashPending,
        verified: !!b.verified,
        driverSalary: Number(b.driverSalary) || 0,
        bookedBy: b.bookedByModel || b.bookedBy || '',
        payment: b.company ? 'Company' : 'Cash/UPI',
        rewardAmount: Number(b.rewardAmount) || 0,
        cancelReason: b.cancelReason || '',
        invoiceNumber: b.invoiceNumber || '',
        archived: !!archived,
    };
}

function summarise(rows) {
    const s = { count: rows.length, totalAmount: 0, collected: 0, balance: 0, driverSalary: 0, km: 0, completed: 0, cancelled: 0, open: 0, verified: 0, cashPendingCount: 0 };
    const byStatus = {}, byDay = {}, byCompany = {}, byAssigned = {};
    for (const r of rows) {
        s.totalAmount += r.totalAmount; s.collected += r.collected; s.balance += r.balance; s.driverSalary += r.driverSalary; s.km += r.km;
        if (r.status === 'Order Completed') s.completed++;
        else if (r.status === 'Cancelled' || r.status === 'Rejected') s.cancelled++;
        else s.open++;
        if (r.verified) s.verified++;
        if (r.cashPending) s.cashPendingCount++;
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        const d = (byDay[r.day] ||= { day: r.day, count: 0, amount: 0 }); d.count++; d.amount += r.totalAmount;
        const c = r.company || r.showroom || 'Direct';
        const cc = (byCompany[c] ||= { name: c, count: 0, amount: 0 }); cc.count++; cc.amount += r.totalAmount;
        if (r.assignedTo) { const a = (byAssigned[r.assignedTo] ||= { name: r.assignedTo, type: r.assignedType, count: 0, amount: 0, km: 0 }); a.count++; a.amount += r.totalAmount; a.km += r.km; }
    }
    const top = (o) => Object.values(o).sort((a, b) => b.count - a.count).slice(0, 10);
    return {
        ...s,
        byStatus,
        byDay: Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)),
        topClients: top(byCompany),
        topAssigned: top(byAssigned),
    };
}

/** GET /reports/bookings */
exports.bookings = asyncErrorHandler(async (req, res) => {
    const { filter, dateField } = bookingFilter(req.query);
    const { from, to } = dateRange(req.query);
    const withArchive = req.query.includeArchived === '1' || req.query.includeArchived === 'true';

    const live = await Booking.find({ ...filter, _includeHidden: true })
        .select(BOOKING_FIELDS)
        .populate(POPULATE)
        .sort({ [dateField]: -1 })
        .limit(MAX_ROWS + 1)
        .lean();
    let archived = [];
    if (withArchive && live.length <= MAX_ROWS) {
        // archived copies whose original is still listed above would be counted twice
        const liveIds = live.map((b) => b._id);
        archived = await BookingArchive.find({ ...filter, originalId: { $nin: liveIds } }).select(BOOKING_FIELDS).populate(POPULATE).sort({ [dateField]: -1 }).limit(MAX_ROWS + 1 - live.length).lean();
    }
    let rows = [...live.map((b) => flatten(b, false)), ...archived.map((b) => flatten(b, true))];
    const truncated = rows.length > MAX_ROWS;
    rows = rows.slice(0, MAX_ROWS);
    res.json({ success: true, from, to, truncated, maxRows: MAX_ROWS, summary: summarise(rows), rows });
});

/** GET /reports/expenses?kind=driver|diesel|company */
exports.expenses = asyncErrorHandler(async (req, res) => {
    const { start, end, from, to } = dateRange(req.query);
    const kind = ['driver', 'diesel', 'company'].includes(req.query.kind) ? req.query.kind : 'driver';
    const status = list(req.query.status);
    const f = { createdAt: { $gte: start, $lt: end } };
    if (status.length) f.status = { $in: status };
    const driverIds = ids(req.query.driver);
    if (driverIds.length && kind !== 'company') f.driver = { $in: driverIds };

    let rows = [];
    if (kind === 'driver') {
        const docs = await Expense.find(f).populate({ path: 'driver', select: 'name' }).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
        rows = docs.map((d) => ({ _id: d._id, date: d.createdAt, day: istDay(d.createdAt), who: d.driver?.name || '', type: d.type || '', description: d.description || '', amount: Number(d.amount) || 0, status: d.status || (d.approve ? 'approved' : 'pending'), settled: !!d.settled, image: d.image || '' }));
    } else if (kind === 'diesel') {
        const docs = await DieselExpense.find(f).populate({ path: 'driver', select: 'name' }).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
        rows = docs.map((d) => ({ _id: d._id, date: d.createdAt, day: istDay(d.createdAt), who: d.driver?.name || '', type: d.vehicleNumber || 'Diesel', description: d.description || '', amount: Number(d.amount) || 0, km: Number(d.expenceKm) || 0, status: d.status || '', image: (d.images || [])[0] || '' }));
    } else {
        const docs = await CompanyExpense.find(f).sort({ createdAt: -1 }).limit(MAX_ROWS).lean();
        rows = docs.map((d) => ({ _id: d._id, date: d.createdAt, day: istDay(d.createdAt), who: d.employee || d.vendor || '', type: d.category || '', description: [d.title, d.description].filter(Boolean).join(' — '), amount: Number(d.amount) || 0, status: d.status || '', image: d.image || '' }));
    }
    const summary = { count: rows.length, amount: 0, byStatus: {}, byType: {} };
    for (const r of rows) {
        summary.amount += r.amount;
        summary.byStatus[r.status] = (summary.byStatus[r.status] || 0) + r.amount;
        summary.byType[r.type || 'Other'] = (summary.byType[r.type || 'Other'] || 0) + r.amount;
    }
    res.json({ success: true, kind, from, to, summary, rows });
});

/** GET /reports/options — names for the filter drop-downs */
exports.options = asyncErrorHandler(async (req, res) => {
    const pick = (docs, label) => docs.map((d) => ({ value: String(d._id), label: d[label] || '—' })).sort((a, b) => a.label.localeCompare(b.label));
    const [companies, showrooms, drivers, providers, serviceTypes] = await Promise.all([
        Company.find().select('name').lean(),
        Showroom.find().select('name').lean(),
        Driver.find().select('name').lean(),
        Provider.find().select('name').lean(),
        ServiceType.find().select('serviceName').lean(),
    ]);
    res.json({
        success: true,
        statuses: ALL_STATUSES,
        companies: pick(companies, 'name'),
        showrooms: pick(showrooms, 'name'),
        drivers: pick(drivers, 'name'),
        providers: pick(providers, 'name'),
        serviceTypes: pick(serviceTypes, 'serviceName'),
    });
});

/** GET /reports/showrooms — per showroom: bookings this month / total, last booking, points, executive, visit this month */
exports.showrooms = asyncErrorHandler(async (req, res) => {
    const Verification = require('../Model/verification');
    const Executive = require('../Model/executive');
    const ym = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).format(new Date());
    const monthStart = new Date(`${ym}-01T00:00:00+05:30`);
    const [stats, visits, list] = await Promise.all([
        Booking.aggregate([
            { $match: { showroom: { $ne: null } } },
            { $group: { _id: '$showroom', total: { $sum: 1 }, thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0] } }, last: { $max: '$createdAt' },
                open: { $sum: { $cond: [{ $in: ['$status', ALL_STATUSES.slice(0, 9)] }, 1, 0] } } } },
        ]),
        Verification.aggregate([{ $group: { _id: '$showroom', last: { $max: '$verificationDate' } } }]),
        Showroom.find().select('name rewardPoints addedBy').lean(),
    ]);
    const execIds = [...new Set(list.map((s) => String(s.addedBy || '')).filter(isId))];
    const execs = execIds.length ? await Executive.find({ _id: { $in: execIds } }).select('name').lean() : [];
    const execName = Object.fromEntries(execs.map((e) => [String(e._id), e.name]));
    const st = Object.fromEntries(stats.map((x) => [String(x._id), x]));
    const vi = Object.fromEntries(visits.map((x) => [String(x._id), x.last]));
    const data = {};
    for (const s of list) {
        const id = String(s._id);
        const lastVisit = vi[id] || null;
        data[id] = {
            bookingsThisMonth: st[id]?.thisMonth || 0,
            bookingsTotal: st[id]?.total || 0,
            openBookings: st[id]?.open || 0,
            lastBookingAt: st[id]?.last || null,
            rewardPoints: s.rewardPoints || 0,
            executive: execName[String(s.addedBy || '')] || '',
            lastVisitAt: lastVisit,
            visitedThisMonth: !!(lastVisit && new Date(lastVisit) >= monthStart),
        };
    }
    res.json({ success: true, monthStart, data });
});

/**
 * GET /reports/showroom-bookings?ids=<id>,<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Case ID, date, vehicle number and status of every booking for the chosen showrooms (for printing).
 * Without dates: all bookings. Old (archived) bookings are included once.
 */
exports.showroomBookings = asyncErrorHandler(async (req, res) => {
    const showroomIds = ids(req.query.ids).slice(0, 100);
    if (!showroomIds.length) return res.status(400).json({ success: false, message: 'Choose at least one showroom.' });
    const f = { showroom: { $in: showroomIds } };
    const day = /^\d{4}-\d{2}-\d{2}$/;
    if (day.test(req.query.from || '') || day.test(req.query.to || '')) {
        f.createdAt = {};
        if (day.test(req.query.from || '')) f.createdAt.$gte = dayStart(req.query.from);
        if (day.test(req.query.to || '')) f.createdAt.$lt = new Date(dayStart(req.query.to).getTime() + 86400000);
    }
    const FIELDS = 'fileNumber createdAt customerVehicleNumber status customerName showroom totalAmount originalId';
    const live = await Booking.find({ ...f, _includeHidden: true }).select(FIELDS).sort({ createdAt: -1 }).limit(20000).lean();
    const archived = await BookingArchive.find({ ...f, originalId: { $nin: live.map((b) => b._id) } }).select(FIELDS).sort({ createdAt: -1 }).limit(20000).lean();
    const showrooms = await Showroom.find({ _id: { $in: showroomIds } }).select('name showroomId phone').lean();
    const byShowroom = Object.fromEntries(showrooms.map((s) => [String(s._id), { _id: s._id, name: s.name, showroomId: s.showroomId || '', phone: s.phone || '', bookings: [] }]));
    for (const b of [...live, ...archived]) {
        const g = byShowroom[String(b.showroom)];
        if (!g) continue;
        g.bookings.push({ fileNumber: b.fileNumber || '', date: b.createdAt, day: istDay(b.createdAt), vehicleNumber: b.customerVehicleNumber || '', status: b.status || '', customerName: b.customerName || '', amount: Number(b.totalAmount) || 0 });
    }
    const data = showroomIds.map((id) => byShowroom[String(id)]).filter(Boolean);
    data.forEach((g) => g.bookings.sort((a, b) => new Date(b.date) - new Date(a.date)));
    res.json({ success: true, data });
});

exports._test = { bookingFilter, dateRange, flatten, summarise };
