/**
 * Tells the customer (on WhatsApp) when their booking's status changes.
 * Only for bookings made through our own customer channels. Never blocks the caller.
 */
const pending = new Set();

exports.statusChanged = (bookingId) => {
    const key = String(bookingId);
    if (pending.has(key)) return;
    pending.add(key);
    setTimeout(async () => {
        pending.delete(key);
        try {
            const wa = require('./whatsapp');
            if (!wa.enabled()) return;
            const Booking = require('../Model/booking');
            const { STEP_TEXT } = require('./customerBooking');
            const b = await Booking.findOne({ _id: bookingId, _includeHidden: true })
                .select('status bookingSource mob1 fileNumber customerVehicleNumber customerNotifiedStatus driver provider')
                .populate('driver', 'name phone').populate('provider', 'name phone').lean();
            if (!b || !b.bookingSource || !b.mob1 || b.customerNotifiedStatus === b.status) return;
            const who = b.driver || b.provider;
            let msg = `RSA Kerala — ${b.customerVehicleNumber || b.fileNumber}\n${STEP_TEXT[b.status] || b.status}.`;
            if (who && ['Order Received', 'On the way to pickup location'].includes(b.status)) {
                msg += `\nDriver: ${who.name || ''}${who.phone ? ` (${who.phone})` : ''}`;
            }
            // live tracking link once a driver is coming (one link per case, reused)
            if (['Order Received', 'On the way to pickup location', 'Vehicle Picked', 'On the way to dropoff location'].includes(b.status)) {
                try {
                    const tracking = require('./tracking');
                    const TrackingLink = require('../Model/trackingLink');
                    let link = await TrackingLink.findOne({ booking: b._id, revokedAt: { $exists: false }, 'createdBy.role': 'system' }).lean();
                    if (!link) link = await tracking.createLink(b._id, { showDriver: true }, { role: 'system', name: 'Customer updates' });
                    if (link) msg += `\nTrack live: ${tracking.urlFor(link.token)}`;
                } catch (e) {
                    console.error('[customerNotify] tracking link', e.message);
                }
            }
            msg += `\nBooking ID: ${b.fileNumber}`;
            await wa.text(`91${b.mob1}`, msg);
            await Booking.collection.updateOne({ _id: b._id }, { $set: { customerNotifiedStatus: b.status } });
        } catch (e) {
            console.error('[customerNotify]', e.message);
        }
    }, 1500); // let the update finish first
};
