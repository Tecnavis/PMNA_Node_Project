/**
 * Moves closed bookings (Completed / Cancelled / Rejected) older than one year to "Old Bookings".
 * Same method the system already uses: a full copy goes to the archive collection and the original
 * is only flagged archived:true (hidden from the live lists). Nothing is deleted.
 * Bookings with cash still pending are left alone.
 */
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');

const CLOSED = ['Order Completed', 'Cancelled', 'Rejected'];
const DAYS = () => Number(process.env.ARCHIVE_AFTER_DAYS) || 365;

const cutoff = () => new Date(Date.now() - DAYS() * 86400000);
const query = () => ({
    status: { $in: CLOSED },
    createdAt: { $lt: cutoff() },
    archived: { $ne: true },
    cashPending: { $ne: true },
});

async function preview() {
    const q = query();
    const [count, oldest] = await Promise.all([
        Booking.countDocuments(q).setOptions({ _includeHidden: true }),
        Booking.findOne(q).select('createdAt').sort({ createdAt: 1 }).setOptions({ _includeHidden: true }).lean(),
    ]);
    return { count, cutoff: cutoff(), days: DAYS(), oldest: oldest?.createdAt || null };
}

let running = false;
async function run({ batchSize = 500, max = 50000 } = {}) {
    if (running) return { success: false, message: 'Already running' };
    running = true;
    let moved = 0;
    try {
        while (moved < max) {
            const batch = await Booking.find(query()).sort({ createdAt: 1 }).limit(batchSize).setOptions({ _includeHidden: true }).lean();
            if (!batch.length) break;
            const ids = batch.map((b) => b._id);
            // don't copy twice if an earlier run stopped half-way
            const already = new Set((await BookingArchive.find({ originalId: { $in: ids } }).select('originalId').lean()).map((a) => String(a.originalId)));
            const docs = batch.filter((b) => !already.has(String(b._id))).map((b) => {
                const d = { ...b, originalId: b._id, archiveDate: new Date(), archived: true, archiveReason: 'one-year' };
                delete d._id;
                return d;
            });
            if (docs.length) await BookingArchive.insertMany(docs, { ordered: false });
            // only flag the ones that are now safely in the archive
            const copied = new Set((await BookingArchive.find({ originalId: { $in: ids } }).select('originalId').lean()).map((a) => String(a.originalId)));
            const okIds = ids.filter((id) => copied.has(String(id)));
            await Booking.collection.updateMany({ _id: { $in: okIds } }, { $set: { archived: true, archivedAt: new Date() } });
            moved += okIds.length;
            if (okIds.length < ids.length) break; // something refused to copy — stop and report
            await new Promise((r) => setTimeout(r, 50));
        }
        return { success: true, moved, message: `${moved} closed bookings older than ${DAYS()} days moved to Old Bookings` };
    } finally {
        running = false;
    }
}

module.exports = { preview, run, CLOSED };
