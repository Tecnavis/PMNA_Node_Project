/**
 * RSA customer app API. Customers log in with their mobile number + SMS OTP.
 */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Customer = require('../Model/customer');
const Booking = require('../Model/booking');
const ServiceType = require('../Model/serviceType');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { createCustomerBooking, normalisePhone, PROBLEMS, STEP_TEXT, STEPS } = require('../services/customerBooking');
const { parseLatLng } = require('./operations')._internals;
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');

const OPEN = ['Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location', 'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location', 'Vehicle Dropped', 'Scheduled'];

// --- abuse guards (per phone and per IP) for SMS sending
const sentAt = new Map();
const ipCount = new Map();
function otpAllowed(phone, ip) {
    const now = Date.now();
    if (now - (sentAt.get(phone) || 0) < 45000) return 'Please wait a moment before asking for another code.';
    const c = ipCount.get(ip) || { n: 0, since: now };
    if (now - c.since > 3600000) { c.n = 0; c.since = now; }
    if (c.n >= 10) return 'Too many requests. Please try again later.';
    c.n++; ipCount.set(ip, c); sentAt.set(phone, now);
    return null;
}

/** test numbers for app-store review / QA: CUSTOMER_TEST_LOGIN="9000000001:123456" */
const testLogin = (phone, otp) => {
    const t = String(process.env.CUSTOMER_TEST_LOGIN || '');
    if (!t.includes(':')) return null;
    const [p, o] = t.split(':');
    if (phone !== p) return null;
    return otp === undefined ? true : otp === o;
};

/** POST /customer/auth/send-otp { phone } */
exports.sendOtp = asyncErrorHandler(async (req, res) => {
    const phone = normalisePhone(req.body?.phone);
    if (!/^[6-9]\d{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
    if (testLogin(phone)) return res.json({ success: true, message: 'OTP sent' });
    const block = otpAllowed(phone, req.ip || 'x');
    if (block) return res.status(429).json({ success: false, message: block });
    const r = await sendOtp('+91', phone);
    if (!r.success) return res.status(502).json({ success: false, message: 'Could not send the code. Please try again.' });
    res.json({ success: true, message: 'OTP sent' });
});

/** POST /customer/auth/verify-otp { phone, otp, name? } */
exports.verifyOtp = asyncErrorHandler(async (req, res) => {
    const phone = normalisePhone(req.body?.phone);
    const otp = String(req.body?.otp || '').trim();
    const test = testLogin(phone, otp);
    if (test === false) return res.status(400).json({ success: false, message: 'Wrong code.' });
    if (!test) {
        const r = await verifyOtp('+91', phone, otp);
        if (!r.success) return res.status(400).json({ success: false, message: r.message || 'Wrong code.' });
    }
    let customer = await Customer.findOne({ phone });
    if (!customer) customer = new Customer({ phone, name: String(req.body?.name || '').trim().slice(0, 80) || undefined });
    if (customer.blocked) return res.status(403).json({ success: false, message: 'This number cannot book online. Please call us.' });
    customer.lastLoginAt = new Date();
    await customer.save();
    const token = jwt.sign({ id: customer._id, role: 'Customer' }, process.env.JWT_SECRET, { expiresIn: process.env.CUSTOMER_TOKEN_EXPIRES || '180d' });
    res.json({ success: true, token, customer });
});

const me = async (req) => {
    if (req.user?.role !== 'Customer') return null;
    const c = await Customer.findById(req.user.id);
    return c && !c.blocked ? c : null;
};
const requireCustomer = (fn) => asyncErrorHandler(async (req, res) => {
    const c = await me(req);
    if (!c) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in again.' });
    return fn(req, res, c);
});

/** GET /customer/me */
exports.getMe = requireCustomer(async (req, res, c) => res.json({ success: true, customer: c }));

/** PUT /customer/me { name, vehicles } */
exports.updateMe = requireCustomer(async (req, res, c) => {
    if (req.body?.name !== undefined) c.name = String(req.body.name).trim().slice(0, 80);
    if (Array.isArray(req.body?.vehicles)) {
        c.vehicles = req.body.vehicles.slice(0, 10).map((v) => ({
            number: String(v?.number || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15),
            brand: String(v?.brand || '').slice(0, 40), model: String(v?.model || '').slice(0, 40), type: String(v?.type || '').slice(0, 30),
        })).filter((v) => v.number.length >= 4);
    }
    await c.save();
    res.json({ success: true, customer: c });
});

/** GET /customer/options — service types, problems and help-line (no login needed) */
exports.options = asyncErrorHandler(async (req, res) => {
    const types = await ServiceType.find().select('serviceName').sort({ serviceName: 1 }).lean();
    res.json({
        success: true,
        helpline: process.env.SUPPORT_PHONE || '',
        whatsapp: process.env.SUPPORT_WHATSAPP || '',
        serviceTypes: types.map((t) => ({ _id: t._id, name: t.serviceName })),
        problems: PROBLEMS,
    });
});

const shape = (b, detail) => {
    const who = b.driver || b.provider;
    const live = who && ['Order Received', 'On the way to pickup location', 'Vehicle Picked', 'Vehicle Confirmed', 'On the way to dropoff location'].includes(b.status);
    const stepIndex = STEPS.indexOf(b.status === 'called to customer' ? 'Booking Added' : b.status === 'Vehicle Confirmed' ? 'Vehicle Picked' : b.status);
    return {
        _id: b._id,
        fileNumber: b.fileNumber,
        status: b.status,
        statusText: STEP_TEXT[b.status] || b.status,
        step: stepIndex,
        steps: STEPS.map((s) => STEP_TEXT[s].split(' — ')[0]),
        open: OPEN.includes(b.status),
        canCancel: b.status === 'Booking Added',
        vehicleNumber: b.customerVehicleNumber,
        pickup: { address: b.location || '', point: parseLatLng(b.latitudeAndLongitude) },
        dropoff: { address: b.dropoffLocation || '', point: parseLatLng(b.dropoffLatitudeAndLongitude) },
        createdAt: b.createdAt,
        statusChangedAt: b.statusChangedAt || b.updatedAt,
        amount: b.totalAmount || null,
        driver: who ? {
            name: who.name || '',
            phone: live ? who.phone || '' : '',
            vehicleNumber: b.vehicleNumber || '',
            point: detail && live ? parseLatLng(who.currentLocation) : null,
            locationUpdatedAt: detail && live ? who.locationUpdatedAt || null : null,
        } : null,
    };
};

/** GET /customer/bookings */
exports.listBookings = requireCustomer(async (req, res, c) => {
    const rows = await Booking.find({ $or: [{ customer: c._id }, { mob1: c.phone, bookingSource: { $exists: true } }], _includeHidden: true })
        .select('fileNumber status customerVehicleNumber location latitudeAndLongitude dropoffLocation dropoffLatitudeAndLongitude createdAt updatedAt statusChangedAt totalAmount vehicleNumber driver provider')
        .populate('driver', 'name').populate('provider', 'name')
        .sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: rows.map((b) => shape(b, false)) });
});

async function findMine(req, c) {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id))) return null;
    return Booking.findOne({ _id: req.params.id, $or: [{ customer: c._id }, { mob1: c.phone, bookingSource: { $exists: true } }], _includeHidden: true });
}

/** GET /customer/bookings/:id — with driver position while on the way */
exports.getBooking = requireCustomer(async (req, res, c) => {
    const b = await findMine(req, c);
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    await b.populate([{ path: 'driver', select: 'name phone currentLocation locationUpdatedAt' }, { path: 'provider', select: 'name phone currentLocation locationUpdatedAt' }]);
    res.json({ success: true, data: shape(b.toObject(), true) });
});

/** POST /customer/bookings */
exports.createBooking = requireCustomer(async (req, res, c) => {
    const open = await Booking.countDocuments({ customer: c._id, status: { $in: OPEN }, _includeHidden: true });
    if (open >= 3) return res.status(429).json({ success: false, message: 'You already have bookings in progress. Please call us for more help.' });
    const body = req.body || {};
    if (body.name && !c.name) { c.name = String(body.name).trim().slice(0, 80); }
    // remember the vehicle for next time
    const num = String(body.vehicleNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (num.length >= 4 && !c.vehicles.some((v) => v.number === num)) {
        c.vehicles.push({ number: num, brand: body.vehicle?.brand || '', model: body.vehicle?.model || '', type: body.vehicle?.type || '' });
        c.vehicles = c.vehicles.slice(-10);
    }
    await c.save();
    try {
        const b = await createCustomerBooking({
            source: 'customer-app', customerId: c._id, name: body.name || c.name, phone: c.phone,
            vehicleNumber: body.vehicleNumber, vehicle: body.vehicle, problem: body.problem, serviceTypeId: body.serviceTypeId,
            pickup: body.pickup, dropoff: body.dropoff, notes: body.notes,
        });
        res.status(201).json({ success: true, data: shape(b.toObject(), false) });
    } catch (e) {
        res.status(e.status || 500).json({ success: false, message: e.status ? e.message : 'Could not create the booking. Please call us.' });
    }
});

/** POST /customer/bookings/:id/cancel { reason } — only before a driver is assigned */
exports.cancelBooking = requireCustomer(async (req, res, c) => {
    const b = await findMine(req, c);
    if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (b.status !== 'Booking Added') return res.status(400).json({ success: false, message: 'A driver is already assigned. Please call us to cancel.' });
    b.status = 'Cancelled';
    b.cancelReason = `Cancelled by customer${req.body?.reason ? `: ${String(req.body.reason).slice(0, 200)}` : ''}`;
    await b.save();
    res.json({ success: true, data: shape(b.toObject(), false) });
});
