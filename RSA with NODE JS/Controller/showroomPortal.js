/**
 * Showroom portal (Showroom DashBoard): only the showroom's own cases.
 *   POST /showroom-portal/bookings/:id/tracking   live tracking link for one of our cases (reused while active)
 *   GET  /showroom-portal/statement?month=YYYY-MM  monthly statement of our cases
 * Works with a showroom login (role Showroom) or a showroom staff login (role ShowroomStaff).
 */
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const TrackingLink = require('../Model/trackingLink');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const tracking = require('../services/tracking');

async function showroomOf(req) {
    const u = req.user || {};
    if (u.role === 'Showroom' && mongoose.Types.ObjectId.isValid(String(u.id))) return String(u.id);
    if (u.role === 'ShowroomStaff') {
        if (u.showroomId && mongoose.Types.ObjectId.isValid(String(u.showroomId))) return String(u.showroomId);
        const Staff = require('../Model/showroomStaff');
        const s = await Staff.findById(u.id).select('showroom showroomId').lean().catch(() => null);
        const sid = s?.showroom || s?.showroomId;
        return sid ? String(sid) : null;
    }
    return null;
}

exports.tracking = asyncErrorHandler(async (req, res) => {
    const showroom = await showroomOf(req);
    if (!showroom) return res.status(403).json({ message: 'Showroom login required' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Booking not found' });
    const b = await Booking.findOne({ _id: req.params.id, showroom, _includeHidden: true }).select('_id status statusChangedAt updatedAt fileNumber customerVehicleNumber mob1 customerName').lean();
    if (!b) return res.status(404).json({ message: 'Booking not found' });

    let link = await TrackingLink.findOne({ booking: b._id, revokedAt: { $exists: false }, 'createdBy.role': 'showroom' }).sort({ createdAt: -1 }).lean();
    if (link && tracking.closedReason(link, b)) link = null;
    if (!link) {
        link = await tracking.createLink(b._id, { showDriver: true }, { role: 'showroom', id: showroom, name: req.user?.name || 'Showroom' });
        require('../services/bookingEvents').record(b._id, 'tracking-shared', { meta: { linkId: String(link._id), showDriver: true, recipients: ['Showroom'] }, by: { role: 'showroom', id: showroom, name: req.user?.name || 'Showroom' } });
    }
    const url = tracking.urlFor(link.token);
    const phone = String(b.mob1 || '').replace(/\D/g, '').slice(-10);
    const message = `RSA Kerala — track ${b.customerVehicleNumber || b.fileNumber || 'your vehicle'} live:\n${url}`;
    res.json({ success: true, url, whatsappUrl: phone.length === 10 ? `https://wa.me/91${phone}?text=${encodeURIComponent(message)}` : null, customer: b.customerName || '' });
});

exports.statement = asyncErrorHandler(async (req, res) => {
    const showroom = await showroomOf(req);
    if (!showroom) return res.status(403).json({ message: 'Showroom login required' });
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? req.query.month : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
    const [y, m] = month.split('-').map(Number);
    const start = new Date(`${month}-01T00:00:00+05:30`);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    const end = new Date(`${next}-01T00:00:00+05:30`);
    const rows = await Booking.find({ showroom, createdAt: { $gte: start, $lt: end }, _includeHidden: true })
        .select('fileNumber createdAt status customerName customerVehicleNumber serviceCategory serviceType totalDistence totalAmount showroomAmount receivedAmount cashPending location dropoffLocation')
        .populate('serviceType', 'serviceName')
        .sort({ createdAt: 1 })
        .lean();
    const Showroom = require('../Model/showroom');
    const sr = await Showroom.findById(showroom).select('name location phone showroomId').lean();
    const cases = rows.map((b) => ({
        _id: b._id,
        fileNumber: b.fileNumber || '',
        date: b.createdAt,
        status: b.status,
        customer: b.customerName || '',
        vehicle: b.customerVehicleNumber || '',
        service: b.serviceType?.serviceName || '',
        category: b.serviceCategory || '',
        route: [b.location, b.dropoffLocation].filter(Boolean).map((x) => String(x).split(',')[0]).join(' → '),
        distance: b.totalDistence ?? null,
        amount: Number(b.totalAmount) || 0,
        showroomAmount: Number(b.showroomAmount) || 0,
        received: Number(b.receivedAmount) || 0,
        cashPending: !!b.cashPending,
    }));
    const done = cases.filter((c) => c.status === 'Order Completed');
    res.json({
        success: true,
        month,
        showroom: sr ? { name: sr.name, location: sr.location || '', phone: sr.phone || '', code: sr.showroomId || '' } : null,
        totals: {
            cases: cases.length,
            completed: done.length,
            cancelled: cases.filter((c) => ['Cancelled', 'Rejected'].includes(c.status)).length,
            amount: done.reduce((s, c) => s + c.amount, 0),
            showroomAmount: done.reduce((s, c) => s + c.showroomAmount, 0),
            received: done.reduce((s, c) => s + c.received, 0),
        },
        cases,
    });
});
