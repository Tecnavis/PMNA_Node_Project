/**
 * Endpoints for the Marketing Executive mobile app (all read-only; writes reuse existing endpoints:
 * POST /showroom to add a showroom, POST /marketing-executives/showroom-verifiction for a visit).
 *
 *   GET /exec/me                 profile + headline numbers
 *   GET /exec/showrooms          my showrooms with this month's bookings and verification status
 *   GET /exec/showrooms/:id      one showroom: details, links/QR, recent bookings, visit history
 */
const mongoose = require('mongoose');
const Executive = require('../Model/executive');
const Showroom = require('../Model/showroom');
const Booking = require('../Model/booking');
const Verification = require('../Model/verification');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { NotFoundError } = require('../Middileware/errorHandler');
const { generateShowRoomLink } = require('../utils/generateLink');

const monthStart = () => {
    // Calendar month in India time
    const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
    return new Date(`${ym}-01T00:00:00+05:30`);
};

const myId = (req) => new mongoose.Types.ObjectId(String(req.user.id || req.user._id));

/** Links are rebuilt from the real id every time (stored links on older showrooms may be wrong). */
function linksFor(showroom, req) {
    const backend = (process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const l = generateShowRoomLink({ ...showroom, _id: String(showroom._id) });
    // generateShowRoomLink falls back to http://localhost:5000 when BACKEND_URL isn't set
    const fix = (u) => (process.env.BACKEND_URL ? u : String(u || '').replace(/^http:\/\/localhost:5000/, backend));
    return { staffSignupLink: l.webLink, appDownloadLink: fix(l.downloadFlowUrl), appDeepLink: l.mobileDeepLink, qrData: fix(l.downloadFlowUrl) };
}

async function statsFor(showroomIds) {
    const start = monthStart();
    const [monthCounts, totalCounts, lastBookings, monthVisits, lastVisits] = await Promise.all([
        Booking.aggregate([{ $match: { showroom: { $in: showroomIds }, createdAt: { $gte: start } } }, { $group: { _id: '$showroom', n: { $sum: 1 } } }]).option({ _includeHidden: true }),
        Booking.aggregate([{ $match: { showroom: { $in: showroomIds } } }, { $group: { _id: '$showroom', n: { $sum: 1 } } }]).option({ _includeHidden: true }),
        Booking.aggregate([{ $match: { showroom: { $in: showroomIds } } }, { $group: { _id: '$showroom', at: { $max: '$createdAt' } } }]).option({ _includeHidden: true }),
        Verification.find({ showroom: { $in: showroomIds }, verificationDate: { $gte: start } }).select('showroom verificationDate').lean(),
        Verification.aggregate([{ $match: { showroom: { $in: showroomIds } } }, { $group: { _id: '$showroom', at: { $max: '$verificationDate' } } }]),
    ]);
    const toMap = (rows, key = 'n') => Object.fromEntries(rows.map((r) => [String(r._id), r[key]]));
    return {
        month: toMap(monthCounts),
        total: toMap(totalCounts),
        lastBooking: toMap(lastBookings, 'at'),
        lastVisit: toMap(lastVisits, 'at'),
        visitedThisMonth: new Set(monthVisits.map((v) => String(v.showroom))),
    };
}

const SHOWROOM_FIELDS = 'name showroomId location latitudeAndLongitude phone mobile helpline state district image bookingPoints rewardPoints services createdAt';

function shape(s, stats) {
    const id = String(s._id);
    return {
        _id: s._id,
        name: s.name,
        code: s.showroomId,
        location: s.location,
        latitudeAndLongitude: s.latitudeAndLongitude,
        phone: s.phone || s.mobile || s.helpline || '',
        district: s.district || '',
        state: s.state || '',
        image: s.image || null,
        points: s.rewardPoints || 0,
        createdAt: s.createdAt,
        bookingsThisMonth: stats.month[id] || 0,
        bookingsTotal: stats.total[id] || 0,
        lastBookingAt: stats.lastBooking[id] || null,
        lastVisitAt: stats.lastVisit[id] || null,
        visitedThisMonth: stats.visitedThisMonth.has(id),
    };
}

// GET /exec/me
exports.me = asyncErrorHandler(async (req, res) => {
    const exec = await Executive.findById(myId(req)).select('-password').lean();
    if (!exec) throw new NotFoundError('Executive not found');
    const showrooms = await Showroom.find({ addedBy: exec._id }).select('_id').lean();
    const ids = showrooms.map((s) => s._id);
    const stats = ids.length ? await statsFor(ids) : { month: {}, visitedThisMonth: new Set() };
    res.json({
        success: true,
        data: {
            _id: exec._id,
            name: exec.name,
            userName: exec.userName,
            phone: exec.phone,
            email: exec.email,
            image: exec.image || null,
            rewardPoints: exec.rewardPoints || 0,
            summary: {
                showrooms: ids.length,
                visitedThisMonth: stats.visitedThisMonth.size,
                visitsDue: ids.length - stats.visitedThisMonth.size,
                bookingsThisMonth: Object.values(stats.month).reduce((a, b) => a + b, 0),
            },
        },
    });
});

// GET /exec/showrooms?search=
exports.showrooms = asyncErrorHandler(async (req, res) => {
    const filter = { addedBy: myId(req) };
    const q = String(req.query.search || '').trim();
    if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { location: rx }, { district: rx }, { showroomId: rx }, { phone: rx }];
    }
    const list = await Showroom.find(filter).select(SHOWROOM_FIELDS).sort({ createdAt: -1 }).lean();
    const stats = list.length ? await statsFor(list.map((s) => s._id)) : null;
    res.json({ success: true, data: list.map((s) => shape(s, stats)) });
});

// GET /exec/showrooms/:id
exports.showroom = asyncErrorHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new NotFoundError('Showroom not found');
    const s = await Showroom.findOne({ _id: req.params.id, addedBy: myId(req) }).select(SHOWROOM_FIELDS + ' description').lean();
    if (!s) throw new NotFoundError('Showroom not found');
    const [stats, recent, visits] = await Promise.all([
        statsFor([s._id]),
        Booking.find({ showroom: s._id, _includeHidden: true }).select('fileNumber status createdAt customerVehicleNumber').sort({ createdAt: -1 }).limit(10).lean(),
        Verification.find({ showroom: s._id }).select('verificationDate image accuracy geoTag').sort({ verificationDate: -1 }).limit(12).lean(),
    ]);
    res.json({
        success: true,
        data: {
            ...shape(s, stats),
            description: s.description || '',
            links: linksFor(s, req),
            recentBookings: recent.map((b) => ({ _id: b._id, fileNumber: b.fileNumber, status: b.status, vehicleNumber: b.customerVehicleNumber, createdAt: b.createdAt })),
            visits: visits.map((v) => ({ _id: v._id, at: v.verificationDate, image: v.image, accuracy: v.accuracy, point: v.geoTag?.coordinates ? { lng: v.geoTag.coordinates[0], lat: v.geoTag.coordinates[1] } : null })),
        },
    });
});
