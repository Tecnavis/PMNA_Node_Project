/**
 * Customer tracking links: create, check, and build what the public tracking page may show.
 * The public view never includes amounts, rates, other cases or internal notes.
 */
const crypto = require('crypto');
const Booking = require('../Model/booking');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const TrackingLink = require('../Model/trackingLink');
const BookingEvent = require('../Model/bookingEvent');
const { roadEstimate, parseLatLng, legFor } = require('../utils/eta');

const FINAL = ['Order Completed', 'Cancelled', 'Rejected'];
const CUSTOMER_STEPS = ['Booking Added', 'Order Received', 'On the way to pickup location', 'Vehicle Picked', 'On the way to dropoff location', 'Vehicle Dropped'];
const STEP_LABEL = {
    'Booking Added': 'Booking received',
    'called to customer': 'Booking received',
    'Order Received': 'Driver assigned',
    'On the way to pickup location': 'Driver on the way',
    'Vehicle Picked': 'Vehicle picked up',
    'Vehicle Confirmed': 'Vehicle picked up',
    'On the way to dropoff location': 'On the way to drop-off',
    'Vehicle Dropped': 'Vehicle dropped',
    'Order Completed': 'Completed',
    Cancelled: 'Cancelled',
    Rejected: 'Cancelled',
    Scheduled: 'Scheduled',
};
// internal statuses folded into the customer's simpler steps
const STEP_OF = { 'called to customer': 'Booking Added', 'Vehicle Confirmed': 'Vehicle Picked', 'Order Completed': 'Vehicle Dropped' };
const GPS_FRESH_MIN = Number(process.env.TRACK_GPS_FRESH_MINUTES || 30);

const baseUrl = () => String(process.env.TRACKING_BASE_URL || 'https://api.rsakerala.com').replace(/\/+$/, '');
const urlFor = (token) => `${baseUrl()}/t/${token}`;
const newToken = () => crypto.randomBytes(18).toString('base64url');

/** null when the link may be opened, otherwise why not ('revoked' | 'expired'). */
function closedReason(link, booking) {
    if (!link) return 'not-found';
    if (link.revokedAt) return 'revoked';
    if (link.expiry === 'hours') return link.expiresAt && link.expiresAt < new Date() ? 'expired' : null;
    if (booking && FINAL.includes(booking.status)) {
        const doneAt = booking.statusChangedAt || booking.updatedAt;
        const hours = Number(link.afterDeliveryHours ?? 24);
        if (doneAt && Date.now() - new Date(doneAt).getTime() > hours * 3600000) return 'expired';
    }
    return null;
}

async function createLink(bookingId, { showDriver = false, showMap = true, expiry = 'after-delivery', hours = 24 } = {}, actor) {
    const booking = await Booking.findOne({ _id: bookingId, _includeHidden: true }).select('_id fileNumber').lean();
    if (!booking) return null;
    const link = await TrackingLink.create({
        token: newToken(),
        booking: booking._id,
        show: { map: showMap !== false, driver: !!showDriver },
        expiry: expiry === 'hours' ? 'hours' : 'after-delivery',
        expiresAt: expiry === 'hours' ? new Date(Date.now() + Math.min(Math.max(Number(hours) || 24, 1), 24 * 14) * 3600000) : undefined,
        afterDeliveryHours: 24,
        createdBy: actor || undefined,
    });
    return link;
}

const shapeLink = (l) => ({
    _id: l._id,
    url: urlFor(l.token),
    show: l.show,
    expiry: l.expiry,
    expiresAt: l.expiresAt || null,
    revokedAt: l.revokedAt || null,
    createdAt: l.createdAt,
    createdBy: l.createdBy?.name || null,
    views: l.views || 0,
    lastViewedAt: l.lastViewedAt || null,
    sentTo: l.sentTo || [],
});

/** What the customer sees for a token. */
async function publicView(token) {
    if (!token || typeof token !== 'string' || token.length > 64) return { closed: 'not-found' };
    const link = await TrackingLink.findOne({ token }).lean();
    if (!link) return { closed: 'not-found' };
    const b = await Booking.findOne({ _id: link.booking, _includeHidden: true })
        .select('fileNumber status statusChangedAt updatedAt createdAt location dropoffLocation latitudeAndLongitude dropoffLatitudeAndLongitude customerVehicleNumber driver provider pickupTime dropoffTime')
        .lean();
    if (!b) return { closed: 'not-found' };
    const closed = closedReason(link, b);
    if (closed) return { closed };

    TrackingLink.updateOne({ _id: link._id }, { $inc: { views: 1 }, $set: { lastViewedAt: new Date() } }).catch(() => undefined);

    const events = await BookingEvent.find({ booking: b._id, type: 'status' }).select('to at').sort({ at: 1 }).lean();
    const firstAt = {};
    for (const e of events) {
        const step = STEP_OF[e.to] || e.to;
        if (!firstAt[step]) firstAt[step] = e.at;
    }
    firstAt['Booking Added'] = firstAt['Booking Added'] || b.createdAt;
    if (b.pickupTime && !firstAt['Vehicle Picked']) firstAt['Vehicle Picked'] = b.pickupTime;
    if (b.dropoffTime && !firstAt['Vehicle Dropped']) firstAt['Vehicle Dropped'] = b.dropoffTime;

    const currentStep = STEP_OF[b.status] || b.status;
    const currentIndex = CUSTOMER_STEPS.indexOf(currentStep);
    const cancelled = ['Cancelled', 'Rejected'].includes(b.status);
    const steps = CUSTOMER_STEPS.map((s, i) => ({
        label: STEP_LABEL[s],
        done: !cancelled && (b.status === 'Order Completed' || (currentIndex >= 0 && i < currentIndex)),
        current: !cancelled && b.status !== 'Order Completed' && i === currentIndex,
        at: firstAt[s] || null,
    }));

    const pickupPoint = parseLatLng(b.latitudeAndLongitude);
    const dropPoint = parseLatLng(b.dropoffLatitudeAndLongitude);
    let vehicle = null;
    let eta = null;
    let driver = null;
    const who = b.driver ? await Driver.findById(b.driver).select('name phone currentLocation locationUpdatedAt').lean()
        : b.provider ? await Provider.findById(b.provider).select('name phone currentLocation locationUpdatedAt').lean() : null;
    if (who && link.show?.driver) driver = { name: who.name || '', phone: who.phone || '' };
    const leg = legFor(b.status);
    if (who && link.show?.map !== false && leg) {
        const point = parseLatLng(who.currentLocation);
        const ageMin = who.locationUpdatedAt ? Math.round((Date.now() - new Date(who.locationUpdatedAt).getTime()) / 60000) : null;
        if (point && ageMin !== null && ageMin <= GPS_FRESH_MIN) {
            vehicle = { point, updatedMinutesAgo: ageMin };
            const target = leg === 'pickup' ? pickupPoint : dropPoint;
            const est = target ? roadEstimate(point, target) : null;
            if (est) eta = { to: leg, minutes: est.minutes, km: est.km, at: new Date(Date.now() + est.minutes * 60000) };
        }
    }

    return {
        fileNumber: b.fileNumber || '',
        status: STEP_LABEL[b.status] || b.status,
        completed: b.status === 'Order Completed',
        cancelled,
        vehicleNumber: b.customerVehicleNumber || '',
        pickup: { address: b.location || '', point: link.show?.map !== false ? pickupPoint : null },
        drop: { address: b.dropoffLocation || '', point: link.show?.map !== false ? dropPoint : null },
        steps,
        vehicle,
        eta,
        driver,
        updatedAt: new Date(),
    };
}

module.exports = { createLink, closedReason, publicView, shapeLink, urlFor, newToken, STEP_LABEL };
