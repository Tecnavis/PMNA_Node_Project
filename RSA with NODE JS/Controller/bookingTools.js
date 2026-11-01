/**
 * Extra tools on one booking for the admin website (no existing booking fields are changed here):
 *
 *   GET    /booking-tools/:id/timeline              everything that happened to the case, with who did it
 *   GET    /booking-tools/:id/tracking-links        links shared with the customer
 *   POST   /booking-tools/:id/tracking-links        create a link { showDriver, showMap, expiry, hours, sendTo:[{name,phone}] }
 *   DELETE /booking-tools/:id/tracking-links/:lid   switch a link off
 *   GET    /booking-tools/:id/suggest-drivers       nearest free drivers/providers for this case
 *   POST   /booking-tools/:id/reassign-approval     log an approved reassignment { to, kind, reason, impact }
 */
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const BookingEvent = require('../Model/bookingEvent');
const TrackingLink = require('../Model/trackingLink');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { currentActor } = require('../utils/requestContext');
const events = require('../services/bookingEvents');
const tracking = require('../services/tracking');
const { roadEstimate, parseLatLng } = require('../utils/eta');

const OPEN = ['Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location', 'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped'];
const validId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));
const actor = (req) => currentActor() || { role: req.user?.role || req.user?.user?.role || null, id: req.user?.id ? String(req.user.id) : null, name: req.user?.name || req.user?.user?.name || null };

async function findBooking(id, select) {
    if (!validId(id)) return null;
    return Booking.findOne({ _id: id, _includeHidden: true }).select(select).lean();
}

// ---------------------------------------------------------------- timeline
const PERSON_TYPES = ['assigned', 'reassign-approved', 'reassign-rejected'];
exports.timeline = asyncErrorHandler(async (req, res) => {
    const b = await findBooking(req.params.id, 'fileNumber status createdAt pickupTime dropoffTime verifiedAt upiVerifiedAt statusChangedAt driver provider bookedBy photosDeletedAt photosDeletedNote');
    if (!b) return res.status(404).json({ message: 'Booking not found' });

    const rows = await BookingEvent.find({ booking: b._id }).sort({ at: 1 }).lean();
    // names for assignment rows
    const ids = [...new Set(rows.filter((r) => ['assigned', 'reassign-approved', 'reassign-rejected'].includes(r.type)).flatMap((r) => [r.from, r.to]).filter(validId))];
    const [ds, ps] = ids.length
        ? await Promise.all([Driver.find({ _id: { $in: ids } }).select('name').lean(), Provider.find({ _id: { $in: ids } }).select('name').lean()])
        : [[], []];
    const nameOf = Object.fromEntries([...ds, ...ps].map((x) => [String(x._id), x.name]));

    const items = rows.map((r) => ({
        _id: r._id,
        type: r.type,
        at: r.at,
        by: r.by?.name || (r.by?.role === 'system' ? 'System' : r.by?.role) || null,
        byRole: r.by?.role || null,
        from: PERSON_TYPES.includes(r.type) ? nameOf[r.from] || '' : r.from || '',
        to: PERSON_TYPES.includes(r.type) ? nameOf[r.to] || r.meta?.name || '' : r.to || '',
        meta: r.meta || null,
        source: 'log',
    }));

    // Cases from before the log existed: show what the booking itself records
    const has = (type, to) => items.some((i) => i.type === type && (!to || i.to === to));
    const extra = [];
    if (!has('created')) extra.push({ type: 'created', at: b.createdAt, to: '', source: 'record' });
    if (b.pickupTime && !has('status', 'Vehicle Picked')) extra.push({ type: 'pickup-photos', at: b.pickupTime, source: 'record' });
    if (b.dropoffTime && !has('status', 'Vehicle Dropped')) extra.push({ type: 'dropoff-photos', at: b.dropoffTime, source: 'record' });
    if (b.verifiedAt) extra.push({ type: 'verified', at: b.verifiedAt, source: 'record' });
    if (b.upiVerifiedAt) extra.push({ type: 'upi-verified', at: b.upiVerifiedAt, source: 'record' });
    if (b.photosDeletedAt) extra.push({ type: 'photos-deleted', at: b.photosDeletedAt, to: b.photosDeletedNote || '', source: 'record' });
    if (!items.some((i) => i.type === 'status') && b.statusChangedAt && b.status) extra.push({ type: 'status', at: b.statusChangedAt, to: b.status, source: 'record' });

    const all = [...items, ...extra.map((e, i) => ({ _id: `r${i}`, by: null, byRole: null, from: '', to: '', meta: null, ...e }))]
        .filter((x) => x.at)
        .sort((a, z) => new Date(a.at) - new Date(z.at));
    res.json({ success: true, fileNumber: b.fileNumber, status: b.status, logStartedEarly: rows.length === 0, items: all });
});

// ---------------------------------------------------------------- tracking links
exports.listLinks = asyncErrorHandler(async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
    const links = await TrackingLink.find({ booking: req.params.id }).sort({ createdAt: -1 }).limit(20).lean();
    const b = await findBooking(req.params.id, 'status statusChangedAt updatedAt customerName mob1 mob2');
    res.json({
        success: true,
        customer: b ? { name: b.customerName || '', phones: [b.mob1, b.mob2].filter(Boolean) } : null,
        links: links.map((l) => ({ ...tracking.shapeLink(l), active: !tracking.closedReason(l, b) })),
    });
});

const cleanPhone = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    if (d.length === 10) return `91${d}`;
    if (d.length === 12 && d.startsWith('91')) return d;
    return d.length >= 10 && d.length <= 15 ? d : null;
};

exports.createLink = asyncErrorHandler(async (req, res) => {
    const { showDriver, showMap, expiry, hours } = req.body || {};
    const sendTo = Array.isArray(req.body?.sendTo) ? req.body.sendTo.slice(0, 5) : [];
    const link = await tracking.createLink(req.params.id, { showDriver, showMap, expiry, hours }, actor(req));
    if (!link) return res.status(404).json({ message: 'Booking not found' });
    const b = await findBooking(req.params.id, 'fileNumber customerVehicleNumber');
    const url = tracking.urlFor(link.token);
    const message = `RSA Kerala — track ${b?.customerVehicleNumber || b?.fileNumber || 'your case'} live:\n${url}`;

    // WhatsApp links the staff member opens (works from any phone/WhatsApp Web, no template needed)
    const recipients = sendTo
        .map((r) => ({ name: String(r?.name || '').slice(0, 80), phone: cleanPhone(r?.phone) }))
        .filter((r) => r.phone)
        .map((r) => ({ ...r, whatsappUrl: `https://wa.me/${r.phone}?text=${encodeURIComponent(message)}` }));
    if (recipients.length) {
        await TrackingLink.updateOne({ _id: link._id }, { $push: { sentTo: { $each: recipients.map((r) => ({ name: r.name, phone: r.phone, channel: 'whatsapp' })) } } });
    }
    events.record(link.booking, 'tracking-shared', {
        meta: { linkId: String(link._id), showDriver: !!link.show.driver, expiry: link.expiry, recipients: recipients.map((r) => r.name || r.phone) },
        by: actor(req),
    });
    res.status(201).json({ success: true, link: { ...tracking.shapeLink(link.toObject()), active: true }, message, recipients });
});

exports.revokeLink = asyncErrorHandler(async (req, res) => {
    if (!validId(req.params.id) || !validId(req.params.lid)) return res.status(404).json({ message: 'Link not found' });
    const link = await TrackingLink.findOneAndUpdate({ _id: req.params.lid, booking: req.params.id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }, { new: true }).lean();
    if (!link) return res.status(404).json({ message: 'Link not found or already off' });
    events.record(link.booking, 'tracking-revoked', { meta: { linkId: String(link._id) }, by: actor(req) });
    res.json({ success: true });
});

// ---------------------------------------------------------------- nearest drivers
const busyIds = async () => {
    const open = await Booking.find({ status: { $in: OPEN }, _includeHidden: true }).select('driver provider').lean();
    const set = new Set();
    for (const b of open) {
        if (b.driver) set.add(String(b.driver));
        if (b.provider) set.add(String(b.provider));
    }
    return set;
};

/** Nearest people with a vehicle for the case's service type, free ones first. Used by the board and the dashboard. */
const loadPeople = () => Promise.all([
    Driver.find({}).select('name phone currentLocation locationUpdatedAt vehicle.serviceType vehicle.vehicleNumber').lean(),
    Provider.find({}).select('name phone currentLocation locationUpdatedAt serviceDetails.serviceType').lean(),
]);
exports.loadPeople = loadPeople;

async function suggestFor(booking, { limit = 3, busy, people } = {}) {
    const pickup = parseLatLng(booking.latitudeAndLongitude);
    if (!pickup) return { pickupKnown: false, suggestions: [] };
    const stId = booking.serviceType ? String(booking.serviceType._id || booking.serviceType) : null;
    const busySet = busy || (await busyIds());
    const [drivers, providers] = people || (await loadPeople());
    const freshMin = Number(process.env.OPS_SUGGEST_GPS_MINUTES || 60);
    const out = [];
    const consider = (p, kind, services) => {
        if (stId && !services.some((s) => String(s?.serviceType || '') === stId)) return;
        const point = parseLatLng(p.currentLocation);
        if (!point) return;
        const age = p.locationUpdatedAt ? Math.round((Date.now() - new Date(p.locationUpdatedAt).getTime()) / 60000) : null;
        if (age === null || age > freshMin) return;
        const est = roadEstimate(point, pickup);
        out.push({ _id: p._id, kind, name: p.name, phone: p.phone, km: est.km, minutes: est.minutes, gpsMinutesAgo: age, busy: busySet.has(String(p._id)) });
    };
    drivers.forEach((d) => consider(d, 'driver', d.vehicle || []));
    providers.forEach((p) => consider(p, 'provider', p.serviceDetails || []));
    out.sort((a, z) => Number(a.busy) - Number(z.busy) || a.km - z.km);
    return { pickupKnown: true, suggestions: out.slice(0, limit) };
}
exports.suggestFor = suggestFor;
exports.busyIds = busyIds;

exports.suggestDrivers = asyncErrorHandler(async (req, res) => {
    const b = await findBooking(req.params.id, 'fileNumber status latitudeAndLongitude serviceType driver provider');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const result = await suggestFor(b, { limit: Math.min(Number(req.query.limit) || 5, 10) });
    res.json({ success: true, ...result, currentId: b.driver || b.provider || null });
});

// ---------------------------------------------------------------- approval log
exports.reassignApproval = asyncErrorHandler(async (req, res) => {
    const b = await findBooking(req.params.id, '_id driver provider');
    if (!b) return res.status(404).json({ message: 'Booking not found' });
    const { to, kind, reason, impact, decision } = req.body || {};
    if (!validId(to)) return res.status(400).json({ message: 'Choose who the case should go to' });
    const approved = decision !== 'rejected';
    await events.record(b._id, approved ? 'reassign-approved' : 'reassign-rejected', {
        from: String(b.driver || b.provider || ''),
        to: String(to),
        meta: { kind: kind === 'provider' ? 'provider' : 'driver', reason: String(reason || '').slice(0, 300), impact: impact && typeof impact === 'object' ? impact : null },
        by: actor(req),
    });
    res.status(201).json({ success: true });
});

// ---------------------------------------------------------------- customer rating
exports.rating = asyncErrorHandler(async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
    const CustomerRating = require('../Model/customerRating');
    const r = await CustomerRating.findOne({ booking: req.params.id }).lean();
    res.json({ success: true, rating: r ? { stars: r.rating, comment: r.comment || '', at: r.at, reviewedAt: r.reviewedAt || null, reviewedBy: r.reviewedBy || null } : null });
});

exports.ratingReviewed = asyncErrorHandler(async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
    const CustomerRating = require('../Model/customerRating');
    const who = actor(req);
    const r = await CustomerRating.findOneAndUpdate({ booking: req.params.id }, { $set: { reviewedAt: new Date(), reviewedBy: who?.name || who?.role || 'admin' } }, { new: true }).lean();
    if (!r) return res.status(404).json({ message: 'No rating for this case' });
    events.record(req.params.id, 'rating-reviewed', { to: String(r.rating), meta: { note: String(req.body?.note || '').slice(0, 300) }, by: who });
    res.json({ success: true });
});
