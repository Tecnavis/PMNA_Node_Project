/**
 * Bulk delete case photos for one company and a date range (admin only).
 * Only CLOSED bookings (Completed / Cancelled / Rejected) are touched, in live and Old Bookings.
 * The photo files are removed from StackCP and the booking's photo list is cleared; the booking
 * itself (amounts, status, history) is not changed. Every run is logged.
 */
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');
const Company = require('../Model/company');
const Staff = require('../Model/staff');
const MediaCleanupJob = require('../Model/mediaCleanupJob');
const { deleteStoredImage } = require('../services/mediaStorage');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const KINDS = {
    pickup: { field: 'pickupImages', array: true, label: 'Pickup photos' },
    dropoff: { field: 'dropoffImages', array: true, label: 'Drop-off photos' },
    inventory: { field: 'inventoryImage', array: false, label: 'Inventory photo' },
    cancel: { field: 'cancelImage', array: false, label: 'Cancel photo' },
    paymentQr: { field: 'qrImage', array: false, label: 'Payment QR' },
};
const CLOSED = ['Order Completed', 'Cancelled', 'Rejected'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const roleOf = (req) => req.user?.role || req.user?.user?.role || '';

function readInput(body) {
    const company = String(body?.company || '');
    if (!mongoose.Types.ObjectId.isValid(company)) throw Object.assign(new Error('Choose a company.'), { status: 400 });
    const from = String(body?.from || ''), to = String(body?.to || '');
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) throw Object.assign(new Error('Choose the From and To dates.'), { status: 400 });
    const start = new Date(`${from}T00:00:00+05:30`);
    const end = new Date(new Date(`${to}T00:00:00+05:30`).getTime() + 86400000);
    if (end <= start) throw Object.assign(new Error('"To" must be on or after "From".'), { status: 400 });
    // never photos of the last 30 days — those may still be needed for claims / verification
    const minAgeDays = Number(process.env.PHOTO_DELETE_MIN_AGE_DAYS) || 30;
    if (end > new Date(Date.now() - minAgeDays * 86400000)) {
        throw Object.assign(new Error(`Photos from the last ${minAgeDays} days can't be bulk deleted. Choose an earlier "To" date.`), { status: 400 });
    }
    const kinds = (Array.isArray(body?.kinds) ? body.kinds : Object.keys(KINDS)).filter((k) => KINDS[k]);
    if (!kinds.length) throw Object.assign(new Error('Choose which photos to delete.'), { status: 400 });
    const filter = { company: new mongoose.Types.ObjectId(company), createdAt: { $gte: start, $lt: end }, status: { $in: CLOSED } };
    return { company, from, to, kinds, filter };
}

const valuesOf = (doc, kinds) => kinds.flatMap((k) => {
    const v = doc[KINDS[k].field];
    return (Array.isArray(v) ? v : v ? [v] : []).filter((x) => typeof x === 'string' && x.trim());
});
const select = (kinds) => ['fileNumber', 'originalId', ...kinds.map((k) => KINDS[k].field)].join(' ');

/** POST /media/bulk-delete/preview */
exports.preview = asyncErrorHandler(async (req, res) => {
    let input;
    try { input = readInput(req.body); } catch (e) { return res.status(e.status || 400).json({ success: false, message: e.message }); }
    const { filter, kinds } = input;
    const [live, archived, company] = await Promise.all([
        Booking.find({ ...filter, _includeHidden: true }).select(select(kinds)).lean(),
        BookingArchive.find(filter).select(select(kinds)).lean(),
        Company.findById(input.company).select('name').lean(),
    ]);
    const liveIds = new Set(live.map((b) => String(b._id)));
    const arch = archived.filter((a) => !liveIds.has(String(a.originalId)));
    const perKind = Object.fromEntries(kinds.map((k) => [k, 0]));
    let withPhotos = 0;
    for (const d of [...live, ...arch]) {
        let any = false;
        for (const k of kinds) {
            const n = valuesOf(d, [k]).length;
            perKind[k] += n;
            if (n) any = true;
        }
        if (any) withPhotos++;
    }
    res.json({
        success: true,
        company: company?.name || '',
        bookings: live.length + arch.length,
        bookingsWithPhotos: withPhotos,
        images: Object.values(perKind).reduce((a, b) => a + b, 0),
        perKind: kinds.map((k) => ({ kind: k, label: KINDS[k].label, count: perKind[k] })),
        sample: [...live, ...arch].slice(0, 5).map((d) => d.fileNumber),
    });
});

let active = null;

/** POST /media/bulk-delete/start { company, from, to, kinds, confirm: "DELETE" } */
exports.start = asyncErrorHandler(async (req, res) => {
    if (roleOf(req) !== 'Admin') return res.status(403).json({ success: false, message: 'Only the admin can delete photos.' });
    if (String(req.body?.confirm || '') !== 'DELETE') return res.status(400).json({ success: false, message: 'Type DELETE to confirm.' });
    if (active) return res.status(409).json({ success: false, message: 'Another photo delete is still running. Please wait.' });
    let input;
    try { input = readInput(req.body); } catch (e) { return res.status(e.status || 400).json({ success: false, message: e.message }); }
    const company = await Company.findById(input.company).select('name').lean();
    const job = await MediaCleanupJob.create({
        filter: { company: input.company, companyName: company?.name || '', from: input.from, to: input.to, kinds: input.kinds },
        requestedBy: mongoose.Types.ObjectId.isValid(String(req.user?.id || '')) ? req.user.id : undefined,
        requestedByName: roleOf(req) === 'Admin' ? 'Admin' : (await Staff.findById(req.user?.id).select('name').lean())?.name || '',
    });
    active = String(job._id);
    res.status(202).json({ success: true, jobId: job._id });
    runJob(job, input).catch(() => undefined).finally(() => { active = null; });
});

async function runJob(job, { filter, kinds }) {
    const progress = { bookingsDone: 0, imagesFound: 0, imagesDeleted: 0, imagesFailed: 0, imagesSkipped: 0 };
    const save = () => MediaCleanupJob.updateOne({ _id: job._id }, { $set: progress });
    const done = new Map(); // file value → deleted?
    try {
        const [live, archived] = await Promise.all([
            Booking.find({ ...filter, _includeHidden: true }).select(select(kinds)).lean(),
            BookingArchive.find(filter).select(select(kinds)).lean(),
        ]);
        const targets = [
            ...live.map((d) => ({ d, coll: Booking.collection })),
            ...archived.map((d) => ({ d, coll: BookingArchive.collection })),
        ].filter(({ d }) => valuesOf(d, kinds).length);
        await MediaCleanupJob.updateOne({ _id: job._id }, { $set: { bookings: targets.length } });

        for (const { d, coll } of targets) {
            const set = {};
            for (const k of kinds) {
                const { field, array } = KINDS[k];
                const values = valuesOf(d, [k]);
                if (!values.length) continue;
                progress.imagesFound += values.filter((v) => !done.has(v)).length;
                const kept = [];
                // the live booking and its Old Bookings copy share files: delete + count each file once
                const fresh = values.filter((v) => !done.has(v));
                for (let i = 0; i < fresh.length; i += 4) {
                    const chunk = fresh.slice(i, i + 4);
                    const results = await Promise.all(chunk.map((v) => deleteStoredImage(v)));
                    results.forEach((ok, j) => {
                        done.set(chunk[j], ok);
                        if (ok) progress.imagesDeleted++;
                        else progress.imagesFailed++;
                    });
                }
                for (const v of values) if (!done.get(v)) kept.push(v);
                set[field] = array ? kept : kept[0] || '';
            }
            // the booking keeps everything else; note when and why photos were removed
            set.photosDeletedAt = new Date();
            set.photosDeletedNote = `Photos removed in bulk (${kinds.join(', ')}) by ${job.requestedByName || 'admin'}`;
            await coll.updateOne({ _id: d._id }, { $set: set });
            progress.bookingsDone++;
            if (progress.bookingsDone % 10 === 0) await save();
        }
        await MediaCleanupJob.updateOne({ _id: job._id }, { $set: { ...progress, status: 'done', finishedAt: new Date() } });
    } catch (e) {
        await MediaCleanupJob.updateOne({ _id: job._id }, { $set: { ...progress, status: 'failed', error: e.message, finishedAt: new Date() } });
    }
}

/** GET /media/bulk-delete/jobs — latest runs (and live progress) */
exports.jobs = asyncErrorHandler(async (req, res) => {
    const rows = await MediaCleanupJob.find().sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: rows });
});

exports._test = { readInput, valuesOf, KINDS };
