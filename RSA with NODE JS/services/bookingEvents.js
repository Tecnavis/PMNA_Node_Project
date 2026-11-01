/**
 * Writes the case activity log (Model/bookingEvent.js). Fire-and-forget: errors are logged, never thrown.
 */
const { currentActor } = require('../utils/requestContext');

const idOf = (v) => (v && typeof v === 'object' ? String(v._id || v) : v ? String(v) : null);

function record(booking, type, fields = {}) {
    try {
        if (!booking) return Promise.resolve();
        const BookingEvent = require('../Model/bookingEvent');
        const by = fields.by || currentActor() || { role: 'system', name: 'System' };
        return BookingEvent.create({ booking: idOf(booking), type, ...fields, by }).catch((e) => console.error('[bookingEvents]', e.message));
    } catch (e) {
        console.error('[bookingEvents]', e.message);
        return Promise.resolve();
    }
}

/** Compare a booking before/after and log status + assignment changes. */
function recordChanges(bookingId, before, after) {
    if (!bookingId || !after) return;
    const b = before || {};
    if (after.status !== undefined && after.status !== b.status) record(bookingId, 'status', { from: b.status || '', to: after.status });
    const newDriver = idOf(after.driver);
    const newProvider = idOf(after.provider);
    if (newDriver && newDriver !== idOf(b.driver)) record(bookingId, 'assigned', { from: idOf(b.driver) || idOf(b.provider) || '', to: newDriver, meta: { kind: 'driver' } });
    if (newProvider && newProvider !== idOf(b.provider)) record(bookingId, 'assigned', { from: idOf(b.provider) || idOf(b.driver) || '', to: newProvider, meta: { kind: 'provider' } });
}

module.exports = { record, recordChanges, idOf };
