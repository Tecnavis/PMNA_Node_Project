var Bookings = require('../Model/booking')
var TaxInsurance = require('../Model/taxInsurance')
const mongoose = require('mongoose');
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { StatusCodes } = require('http-status-codes');
const path = require('path');
const fs = require('fs');

exports.dashboard = async (req, res) => {
    try {

        // Aggregation for dashboard data(counting document based on the condition)
        const pipeline = [
            {
                $group: {
                    _id: null,
                    newBookingsShowRoom: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "Booking Added"] }, { $in: ["$bookedByModel", ["Showroom", "ShowroomStaff"]] }] },
                                1,
                                0
                            ]
                        }
                    },
                    newBookingsOther: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "Booking Added"] }, { $not: [{ $in: ["$bookedByModel", ["Showroom", "ShowroomStaff"]] }] }, { $ne: ["$isWhatsappBooking", true] }] },
                                1,
                                0
                            ]
                        }
                    },
                    pendingBookings: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        "$status",
                                        [
                                            "called to customer",
                                            "Order Received",
                                            "On the way to pickup location",
                                            "Vehicle Picked",
                                            "Vehicle Confirmed",
                                            "To DropOff Location",
                                            "On the way to dropoff location",
                                            "Vehicle Dropped"
                                        ]
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    completedBookings: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "Order Completed"] },
                                1,
                                0
                            ]
                        }
                    },
                    whatsappBooking: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "Booking Added"] }, { $eq: ["$isWhatsappBooking", true] }] },
                                1,
                                0
                            ]
                        }
                    },
                }
            }

        ]
        const newBookings = await Bookings.aggregate(pipeline);

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(today.getDate() + 7);
        sevenDaysLater.setHours(23, 59, 59, 999); // Set to end of day

        // Fetch all records that have any expiry date within the next 7 days
        const records = await TaxInsurance.find({
            $or: [
                { emiExpiryDate: { $lte: sevenDaysLater, $gte: today }, emiDue: false },
                { insuranceExpiryDate: { $lte: sevenDaysLater, $gte: today }, insuranceDue: false, insuranceDueDismissed: false },
                { pollutionExpiryDate: { $lte: sevenDaysLater, $gte: today }, pollutionDue: false, pollutionDueDismissed: false },
                { taxExpiryDate: { $lte: sevenDaysLater, $gte: today }, taxDue: false, taxDueDismissed: false },
                { permitExpiryDate: { $lte: sevenDaysLater, $gte: today }, permitDue: false, permitDueDismissed: false }
            ]
        }).lean();

        //Create individual array item for expired records
        const filteredRecords = records.flatMap((record) => {

            const expiredFields = [];

            const isWithinNext7Days = (expiryDate) => {
                const date = new Date(expiryDate);
                return date >= today || date <= sevenDaysLater;
            };

            if (!record.emiDue && !record.emiDue && new Date(record.emiExpiryDate) >= today && new Date(record.emiExpiryDate) <= sevenDaysLater) {
                expiredFields.push({
                    _id: record._id,
                    type: "EMI",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.emiExpiryDate,
                });
            }
            if (!record.insuranceDue && !record.insuranceDueDismissed &&
                new Date(record.insuranceExpiryDate) >= today && new Date(record.insuranceExpiryDate) <= sevenDaysLater) {
                expiredFields.push({
                    _id: record._id,
                    type: "Insurance",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.insuranceExpiryDate,
                });
            }
            if (!record.pollutionDue && !record.pollutionDueDismissed &&
                new Date(record.pollutionExpiryDate) >= today && new Date(record.pollutionExpiryDate) <= sevenDaysLater) {
                expiredFields.push({
                    _id: record._id,
                    type: "Pollution",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.pollutionExpiryDate,
                });
            }
            if (!record.taxDue && !record.taxDueDismissed &&
                new Date(record.taxExpiryDate) >= today && new Date(record.taxExpiryDate) <= sevenDaysLater) {
                expiredFields.push({
                    _id: record._id,
                    type: "Tax",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.taxExpiryDate,
                });
            }
            if (!record.permitDue && !record.permitDueDismissed &&
                new Date(record.permitExpiryDate) >= today && new Date(record.permitExpiryDate) <= sevenDaysLater) {
                expiredFields.push({
                    _id: record._id,
                    type: "Permit",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.permitExpiryDate,
                });
            }

            return expiredFields;
        });

        res.status(201).json({
            bookingData: newBookings,
            records: filteredRecords
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error fetching dashboard data', error });
    }
}


exports.showroomDashboard = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid showroom' });
    }
    const showroomId = new mongoose.Types.ObjectId(id);
    try {
        // A showroom (or its staff) can only see its own dashboard
        const role = req.user?.role || req.user?.user?.role;
        if (role === 'Showroom' && String(req.user.id) !== String(id)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (role === 'ShowroomStaff') {
            const ShowroomStaff = require('../Model/showroomStaff');
            const staff = await ShowroomStaff.findById(req.user.id).select('showroomId').lean();
            if (!staff || String(staff.showroomId) !== String(id)) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        const OPEN = ['Booking Added', 'called to customer', 'Order Received', 'On the way to pickup location', 'Vehicle Picked',
            'Vehicle Confirmed', 'To DropOff Location', 'On the way to dropoff location', 'Vehicle Dropped'];
        const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
        const monthStart = new Date(`${ym}-01T00:00:00+05:30`);
        const sixMonthsAgo = new Date(monthStart); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

        const [counts, monthly, open, recent, showroom] = await Promise.all([
            Bookings.aggregate([
                { $match: { showroom: showroomId } },
                {
                    $group: {
                        _id: null,
                        totalBookings: { $sum: 1 },
                        // "booking added" (lowercase) never matched — new bookings always showed 0
                        newBookingsOther: { $sum: { $cond: [{ $eq: ['$status', 'Booking Added'] }, 1, 0] } },
                        pendingBookings: { $sum: { $cond: [{ $in: ['$status', OPEN.slice(1)] }, 1, 0] } },
                        completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'Order Completed'] }, 1, 0] } },
                        cancelledBookings: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Rejected']] }, 1, 0] } },
                        thisMonth: { $sum: { $cond: [{ $gte: ['$createdAt', monthStart] }, 1, 0] } },
                        rewardUsed: { $sum: { $ifNull: ['$rewardAmount', 0] } },
                    },
                },
            ]),
            Bookings.aggregate([
                { $match: { showroom: showroomId, createdAt: { $gte: sixMonthsAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'Asia/Kolkata' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Bookings.find({ showroom: showroomId, status: { $in: OPEN }, _includeHidden: true })
                .select('fileNumber status customerName customerVehicleNumber createdAt pickupDate statusChangedAt driver provider dummyDriverName')
                .populate('driver', 'name').populate('provider', 'name')
                .sort({ createdAt: -1 }).limit(25).lean(),
            Bookings.find({ showroom: showroomId, status: { $in: ['Order Completed', 'Cancelled', 'Rejected'] }, _includeHidden: true })
                .select('fileNumber status customerName customerVehicleNumber createdAt updatedAt')
                .sort({ updatedAt: -1 }).limit(8).lean(),
            require('../Model/showroom').findById(showroomId).select('name rewardPoints helpline phone').lean(),
        ]);

        // last 6 months, including months with no bookings
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(monthStart); d.setMonth(d.getMonth() - i);
            const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date(d.getTime() + 86400000));
            months.push({ month: key, count: monthly.find((m) => m._id === key)?.count || 0 });
        }

        const stats = counts[0] || { totalBookings: 0, newBookingsOther: 0, pendingBookings: 0, completedBookings: 0, cancelledBookings: 0, thisMonth: 0, rewardUsed: 0 };
        delete stats._id;
        res.status(201).json({
            bookingData: [stats],               // same shape as before for older screens
            stats,
            rewardPoints: showroom?.rewardPoints || 0,
            months,
            openBookings: open.map((b) => ({
                _id: b._id, fileNumber: b.fileNumber, status: b.status, customerName: b.customerName, vehicleNumber: b.customerVehicleNumber,
                createdAt: b.createdAt, pickupDate: b.pickupDate, statusChangedAt: b.statusChangedAt || null,
                assignedTo: b.driver?.name || b.provider?.name || b.dummyDriverName || '',
            })),
            recentClosed: recent.map((b) => ({ _id: b._id, fileNumber: b.fileNumber, status: b.status, customerName: b.customerName, vehicleNumber: b.customerVehicleNumber, at: b.updatedAt || b.createdAt })),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
};

exports.logs = asyncErrorHandler(async (req, res) => {
    const logFilePath = path.join(__dirname, '../logs/app.log');

    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read log file' });
        }

        // Split logs by line and send as JSON array
        const logLines = data.trim().split('\n').map(line => {
            try {
                return JSON.parse(line); // If logs are in JSON format (pino default)
            } catch (e) {
                return { raw: line }; // fallback for non-JSON lines
            }
        });

        res.json(logLines);
    });
})