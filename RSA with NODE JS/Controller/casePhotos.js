/**
 * GET /media/case-photos?q=RSA-1234            case (file) number or vehicle number, partial match
 * GET /media/case-photos?date=2026-10-15       all cases created that day (India time)
 * GET /media/case-photos?from=2026-10-01&to=2026-10-15
 * (q and dates can be combined)
 *
 * Looks in both live and archived bookings, so photos from before the StackCP move show up too.
 * Returns the stored image values; the admin site turns them into URLs with getImageUrl().
 */
const Booking = require('../Model/booking');
const BookingArchive = require('../Model/bookingArchive');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { BadRequestError } = require('../Middileware/errorHandler');

const MAX_RESULTS = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHOTO_FIELDS = 'fileNumber customerName customerVehicleNumber status createdAt pickupImages dropoffImages cancelImage inventoryImage qrImage';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** India-time day boundaries: "2026-10-15" → 2026-10-14T18:30Z */
const istDayStart = (d) => new Date(`${d}T00:00:00+05:30`);

function buildFilter({ q, date, from, to }) {
    const filter = {};
    const text = String(q || '').trim();
    if (text) {
        if (text.length < 2) throw new BadRequestError('Type at least 2 characters of the case or vehicle number');
        const rx = new RegExp(escapeRegex(text), 'i');
        filter.$or = [{ fileNumber: rx }, { customerVehicleNumber: rx }];
    }

    const start = date || from;
    const end = date || to || from;
    if (start || end) {
        if (!DATE_RE.test(start) || !DATE_RE.test(end)) throw new BadRequestError('Dates must look like 2026-10-15');
        const gte = istDayStart(start);
        const lt = new Date(istDayStart(end).getTime() + 24 * 60 * 60 * 1000);
        if (lt <= gte) throw new BadRequestError('"to" date must be on or after "from" date');
        if (lt - gte > 62 * 24 * 60 * 60 * 1000) throw new BadRequestError('Pick a date range of 2 months or less');
        filter.createdAt = { $gte: gte, $lt: lt };
    }

    if (!text && !filter.createdAt) throw new BadRequestError('Enter a case ID / vehicle number or a date');
    return filter;
}

const toPhotoList = (v) => (Array.isArray(v) ? v : v ? [v] : []).filter((x) => typeof x === 'string' && x.trim());

function shape(doc, archived) {
    const photos = {
        pickup: toPhotoList(doc.pickupImages),
        dropoff: toPhotoList(doc.dropoffImages),
        cancel: toPhotoList(doc.cancelImage),
        inventory: toPhotoList(doc.inventoryImage),
        paymentQr: toPhotoList(doc.qrImage),
    };
    const all = Object.values(photos).flat();
    // Folder on StackCP for photos saved with the organised layout (null for older photos)
    const organised = all.find((v) => v.startsWith('bookings/'));
    return {
        _id: doc._id,
        fileNumber: doc.fileNumber || '',
        customerName: doc.customerName || '',
        vehicleNumber: doc.customerVehicleNumber || '',
        status: doc.status || '',
        createdAt: doc.createdAt,
        archived,
        photoCount: all.length,
        stackcpFolder: organised ? organised.split('/').slice(0, -1).join('/') : null,
        photos,
    };
}

exports.searchCasePhotos = asyncErrorHandler(async (req, res) => {
    const filter = buildFilter(req.query);
    const onlyWithPhotos = String(req.query.withPhotos) === 'true';

    const [live, archived] = await Promise.all([
        Booking.find(filter).select(PHOTO_FIELDS).sort({ createdAt: -1 }).limit(MAX_RESULTS + 1).lean(),
        BookingArchive.find(filter).select(PHOTO_FIELDS).sort({ createdAt: -1 }).limit(MAX_RESULTS + 1).lean(),
    ]);

    let cases = [...live.map((d) => shape(d, false)), ...archived.map((d) => shape(d, true))]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (onlyWithPhotos) cases = cases.filter((c) => c.photoCount > 0);

    const truncated = cases.length > MAX_RESULTS;
    res.status(200).json({
        success: true,
        count: Math.min(cases.length, MAX_RESULTS),
        truncated,
        data: cases.slice(0, MAX_RESULTS),
    });
});

exports._buildFilter = buildFilter; // for tests
