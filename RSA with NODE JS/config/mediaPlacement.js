/**
 * Where each kind of upload is stored on StackCP, so files are easy to find
 * in the StackCP File Manager by date and case ID.
 *
 *   bookings/2026/10/15/RSA-1234/pickup-20261015-143210-k3f9q2.jpg   ← date the case was created + case (file) number
 *   bookings/2026/10/15/RSA-1234/dropoff-…  cancel-…  inventory-…  payment-qr-…
 *   expenses/2026/10/15/expense-…           diesel-expenses/2026/10/15/diesel-…
 *   company-expenses/2026/10/15/company-expense-…
 *   profiles/drivers/driver-rahul-k-…       profiles/staff/…  profiles/showrooms/…
 *   vehicles/KL07AB1234/insurance-…  tax-…
 *   verifications/2026/10/15/verification-…  rewards/reward-…  admin/payment-qr-…
 *
 * Dates are India time (Asia/Kolkata) even though the server runs in UTC.
 *
 * A placement is { folder: string | (req) => string | Promise<string>,
 *                  prefix: string | (req, index) => string }
 */
const mongoose = require('mongoose');

const TIME_ZONE = 'Asia/Kolkata';

function istParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(date));
    const get = (type) => parts.find(p => p.type === type).value;
    return { y: get('year'), m: get('month'), d: get('day'), H: get('hour'), M: get('minute'), S: get('second') };
}

/** "2026/10/15" in India time */
function datePath(date = new Date()) {
    const { y, m, d } = istParts(date);
    return `${y}/${m}/${d}`;
}

/** "20261015-143210" in India time — used in file names so they sort by time */
function stamp(date = new Date()) {
    const { y, m, d, H, M, S } = istParts(date);
    return `${y}${m}${d}-${H}${M}${S}`;
}

/** Safe folder/file-name piece: "RSA/1234 A" → "RSA-1234-A" */
function slug(value, max = 40) {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/[^A-Za-z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[^A-Za-z0-9]+/, '')
        .slice(0, max)
        .replace(/[-_]+$/, '');
}

const resolve = (valueOrFn, ...args) => (typeof valueOrFn === 'function' ? valueOrFn(...args) : valueOrFn);

// ---------------------------------------------------------------- bookings
async function findBookingForRequest(req) {
    const id = req.params.id || req.params.bookingId || req.body?.bookingId;
    if (!id || !mongoose.isValidObjectId(id)) return null;
    const Booking = require('../Model/booking');
    let booking = await Booking.findById(id).select('fileNumber createdAt').lean();
    if (!booking) {
        const BookingArchive = require('../Model/bookingArchive');
        booking = await BookingArchive.findById(id).select('fileNumber createdAt').lean().catch(() => null);
    }
    return booking;
}

/**
 * Photos of a case go together: bookings/<yyyy>/<mm>/<dd>/<file number>/
 * @param kind 'pickup' | 'dropoff' | 'cancel' | 'inventory' | 'payment-qr' | (req) => kind
 */
function bookingPhotos(kind) {
    return {
        folder: async (req) => {
            const booking = await findBookingForRequest(req);
            if (!booking) return `bookings/unassigned/${datePath()}`;
            const caseId = slug(booking.fileNumber, 60) || String(booking._id);
            return `bookings/${datePath(booking.createdAt || new Date())}/${caseId}`;
        },
        prefix: (req) => resolve(kind, req),
    };
}

// ---------------------------------------------------------------- others
/** <top>/<yyyy>/<mm>/<dd>/<prefix>-… (upload date) */
function dated(top, prefix) {
    return { folder: () => `${top}/${datePath()}`, prefix };
}

/** profiles/<kind>/<singular>-<name>-…  e.g. profiles/drivers/driver-rahul-k-20261015-… */
function profile(kind, singular) {
    return {
        folder: `profiles/${kind}`,
        prefix: (req) => [singular, slug(req.body?.name || req.body?.userName || req.params?.id, 30)].filter(Boolean).join('-'),
    };
}

/** vehicles/<vehicle number>/insurance-… and tax-… (first file = insurance, second = tax, like the controller) */
const vehiclePapers = {
    folder: (req) => `vehicles/${slug(req.body?.vehicleNumber, 30) || 'unknown'}`,
    prefix: (req, index) => {
        const insuranceChanged = String(req.body?.insurancePaperChange) === 'true';
        const taxChanged = String(req.body?.taxPaperChange) === 'true';
        if (!insuranceChanged && taxChanged) return 'tax';   // update with only a new tax paper
        return index === 0 ? 'insurance' : 'tax';
    },
};

module.exports = {
    bookingPhotos,
    dated,
    profile,
    vehiclePapers,
    reward: { folder: 'rewards', prefix: (req) => ['reward', slug(req.body?.name || req.body?.title, 30)].filter(Boolean).join('-') },
    adminQr: { folder: 'admin', prefix: 'payment-qr' },
    // helpers (used by config/multer.js and tests)
    datePath,
    stamp,
    slug,
    resolve,
};
