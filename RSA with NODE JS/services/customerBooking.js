/**
 * Creates a booking that came straight from a customer (RSA app or WhatsApp).
 * It lands in the office as a normal "Booking Added" case; staff confirm the price and assign a driver.
 */
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const ServiceType = require('../Model/serviceType');

const PROBLEMS = ['Accident', 'Breakdown / not starting', 'Flat tyre', 'Battery problem', 'Locked out / key lost', 'Fuel', 'Stuck / off-road', 'Other'];

const normalisePhone = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    return d.length > 10 ? d.slice(-10) : d;
};
const vehicleNo = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
const latLng = (pt) => {
    const lat = Number(pt?.lat), lng = Number(pt?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : '';
};

async function newFileNumber(prefix) {
    const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: '2-digit', month: '2-digit', day: '2-digit' }).format(new Date()).replace(/-/g, '');
    for (let i = 0; i < 6; i++) {
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        const fn = `${prefix}-${d}-${rand}`;
        if (!(await Booking.exists({ $or: [{ fileNumber: fn }, { whatsappId: fn }] }).setOptions({ _includeHidden: true }))) return fn;
    }
    return `${prefix}-${d}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * @param {object} b { source: 'customer-app'|'whatsapp', customerId?, name, phone, vehicleNumber, vehicle?, problem?, serviceTypeId?, pickup:{address,lat,lng}, dropoff?:{address,lat,lng}, notes? }
 */
async function createCustomerBooking(b) {
    const phone = normalisePhone(b.phone);
    if (phone.length !== 10) throw Object.assign(new Error('A valid 10-digit mobile number is needed.'), { status: 400 });
    const number = vehicleNo(b.vehicleNumber);
    if (number.length < 4) throw Object.assign(new Error('Please enter the vehicle number.'), { status: 400 });
    const pickupAddress = String(b.pickup?.address || '').trim().slice(0, 300);
    const pickupPoint = latLng(b.pickup);
    if (!pickupAddress && !pickupPoint) throw Object.assign(new Error('Please share the pickup location.'), { status: 400 });

    let serviceType = null;
    if (b.serviceTypeId && mongoose.Types.ObjectId.isValid(String(b.serviceTypeId))) {
        serviceType = (await ServiceType.findById(b.serviceTypeId).select('_id').lean())?._id || null;
    }
    const prefix = b.source === 'whatsapp' ? 'WA' : 'APP';
    const fileNumber = await newFileNumber(prefix);
    const vehicle = [b.vehicle?.brand, b.vehicle?.model].filter(Boolean).join(' ').slice(0, 60);
    const comments = [
        b.problem ? `Problem: ${String(b.problem).slice(0, 80)}` : '',
        b.notes ? `Customer note: ${String(b.notes).slice(0, 400)}` : '',
        `Booked by customer via ${b.source === 'whatsapp' ? 'WhatsApp' : 'RSA app'}`,
    ].filter(Boolean).join(' | ');

    const booking = new Booking({
        fileNumber,
        whatsappId: fileNumber,
        status: 'Booking Added',
        isWhatsappBooking: true,            // shows in the office "online / WhatsApp" new-booking alert
        bookingSource: b.source,
        customer: b.customerId || undefined,
        createdBy: b.customerId || undefined,
        bookedByModel: b.customerId ? 'Customer' : undefined,
        bookedBy: b.source === 'whatsapp' ? 'WhatsApp' : 'Customer app',
        customerName: String(b.name || '').trim().slice(0, 80) || 'Customer',
        mob1: phone,
        customerVehicleNumber: number,
        brandName: vehicle || undefined,
        vehicleType: b.vehicle?.type || undefined,
        serviceType,
        location: pickupAddress || pickupPoint,
        latitudeAndLongitude: pickupPoint || undefined,
        dropoffLocation: String(b.dropoff?.address || '').trim().slice(0, 300) || undefined,
        dropoffLatitudeAndLongitude: latLng(b.dropoff) || undefined,
        comments,
        company: null,
        showroom: null,
        baselocation: null,
    });
    await booking.save();
    try { require('../config/socket').emitOps?.('ops:new-booking', { _id: booking._id, fileNumber, source: b.source }); } catch (e) { /* socket optional */ }
    return booking;
}

/** what a customer may see about a booking */
const STEP_TEXT = {
    'Booking Added': 'Booking received — our team will call you shortly',
    'called to customer': 'Our team has called you',
    'Order Received': 'A driver has been assigned',
    'On the way to pickup location': 'Driver is on the way to you',
    'Vehicle Picked': 'Your vehicle has been picked up',
    'Vehicle Confirmed': 'Your vehicle is loaded and confirmed',
    'On the way to dropoff location': 'On the way to the drop-off location',
    'Vehicle Dropped': 'Your vehicle has been dropped',
    'Order Completed': 'Completed — thank you for choosing RSA Kerala',
    Cancelled: 'Cancelled',
    Rejected: 'Cancelled',
    Scheduled: 'Scheduled',
};
const STEPS = ['Booking Added', 'Order Received', 'On the way to pickup location', 'Vehicle Picked', 'On the way to dropoff location', 'Vehicle Dropped', 'Order Completed'];

module.exports = { createCustomerBooking, normalisePhone, PROBLEMS, STEP_TEXT, STEPS };
