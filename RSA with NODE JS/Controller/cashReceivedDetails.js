const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')
const Booking = require('../Model/booking.js')
const Advance = require('../Model/advance.js')
const Provider = require('../Model/provider');
const { default: mongoose } = require('mongoose');
const Staff = require('../Model/staff');

exports.createReceivedDetails = async (req, res) => {
    try {
        const { amount, currentNetAmount, driver, receivedAmount, remark, totalAmount } = req.body;
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role || req.user?.user?.role; // Changed to userRole for clarity
        const receivedUserId = userId;

        if (!amount || !driver || !receivedAmount) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const associateDriver = await Driver.findById(driver);
        if (!associateDriver) {
            return res.status(404).json({ message: 'Driver not found' });
        }
// -----------------------
        let remainingAmount = receivedAmount;
        const selectedBookingIds = [];

        // Fetch bookings including partially received Staff payments and non-Staff payments
        const bookings = await Booking.find({
            status: 'Order Completed',
            driver,
            workType: 'PaymentWork',
            cashPending: false,
            $or: [
                { receivedUser: { $ne: 'Staff' } },
                {
                    receivedUser: 'Staff',
                    partialReceivedAmountStaff: true
                }
            ],
            $expr: { $gt: ["$totalAmount", "$receivedAmount"] }
        }).sort({ createdAt: 1 });

        // Update bookings by distributing receivedAmount
        for (const booking of bookings) {
            if (remainingAmount <= 0) break;
            // Store previous values before making changes
            const previousReceivedUser = booking.receivedUser;
            const previousReceivedUserId = booking.receivedUserId;

            // Calculate balance based on payment type
            let bookingBalance;
            if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff === true) {
                bookingBalance = booking.totalAmount - (booking.receivedAmountStaff || 0);
            } else {
                bookingBalance = booking.totalAmount - (booking.receivedAmount || 0);
            }

            if (bookingBalance > 0) {
                const appliedAmount = Math.min(remainingAmount, bookingBalance);

                if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff === true) {
                    // For partially received Staff payments
                    if (userRole === 'Staff') {
                        // Staff user - update receivedAmountStaff
                        booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + appliedAmount;
                    } else {
                        // Non-Staff user - update givenAmountByStaff instead
                        booking.receivedAmount = (booking.receivedAmountStaff || 0) + appliedAmount;
                    }
                    // -------------------------------------------------------
                    // Calculate total received amount (combining both fields if needed)
                    const totalReceived = booking.receivedUser === 'Staff'
                        ? (booking.receivedAmountStaff || 0)
                        : (booking.receivedAmount || 0);

                    // Check if fully paid now (using precise decimal comparison)
                    if (Math.abs(totalReceived - booking.totalAmount) < 0.01) { // Accounting for floating point precision
                        booking.partialReceivedAmountStaff = false;
                        booking.receivedAmount = booking.totalAmount; // Set full received amount
                        if (booking.receivedUser === 'Staff') {
                            booking.receivedAmountStaff = booking.totalAmount;
                        }
                    } else {
                        booking.partialReceivedAmountStaff = true;
                    }
                } else {
                    // For non-Staff payments or new Staff payments
                    booking.receivedAmount = (booking.receivedAmount || 0) + appliedAmount;

                    if (userRole === 'Staff') {
                        booking.receivedAmountStaff = appliedAmount;
                        // Check if payment fully covers the amount
                        booking.partialReceivedAmountStaff = (booking.receivedAmount || 0) < booking.totalAmount;
                    }

                    // Additional check for non-Staff full payment
                    if (Math.abs(booking.receivedAmount - booking.totalAmount) < 0.01) {
                        booking.partialReceivedAmountStaff = false;
                    }
                }

                // Only update these fields if the receiver is changing
                if (previousReceivedUser !== userRole) {
                    booking.previousReceivedUser = previousReceivedUser;
                    booking.previousReceivedUserId = previousReceivedUserId;
                }

                // Set the received user info
                booking.receivedUser = userRole;
                booking.receivedUserId = new mongoose.Types.ObjectId(receivedUserId);

                remainingAmount -= appliedAmount;
                selectedBookingIds.push(booking._id);
                await booking.save();
            }
        }

        // [Rest of your code remains the same...]
        // Deduct remaining amount from driver's advance
        if (remainingAmount > 0) {
            const currentAdvance = associateDriver.advance || 0;
            const newAdvance = Math.max(0, currentAdvance - remainingAmount);
            associateDriver.advance = newAdvance;
            await associateDriver.save();

            // Update last advance record if exists
            const lastAdvance = await Advance.findOne({ driver: associateDriver._id }).sort({ createdAt: -1 }); if (lastAdvance) {
                lastAdvance.advance = Math.max(0, lastAdvance.advance - remainingAmount);
                await lastAdvance.save();
            }

            // Create received details for advance deduction
            await ReceivedDetails.create({
                remark,
                balance: newAdvance,
                fileNumber: 'Advance Deduction',
                currentNetAmount: 0,
                amount: `Advance: ${lastAdvance?.advance || 0}`,
                driver: associateDriver._id,
                receivedAmount: remainingAmount,
                totalAmount: totalAmount,
                receivedUser: userRole,
                receivedUserId,
            });
        }

        // Create received details for each updated booking
        for (const bookingId of selectedBookingIds) {
            const booking = await Booking.findById(bookingId);

            // Change the record creation to:
            let amountToRecord;
            if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff === true) {
                amountToRecord = (booking.receivedAmountStaff || 0) + (booking.receivedAmount || 0);
            } else {
                amountToRecord = booking.receivedAmount || 0;
            }

            const balance = (booking.totalAmount - amountToRecord).toString();

            await ReceivedDetails.create({
                remark,
                balance: balance,
                fileNumber: booking.fileNumber,
                currentNetAmount: balance,
                amount: booking.totalAmount,
                driver: associateDriver._id,
                receivedAmount: amountToRecord,
                totalAmount: totalAmount,
                receivedUser: userRole,
                receivedUserId,
            });
        }

        res.status(201).json({
            message: 'Received details created successfully',
            distributedAmount: receivedAmount - remainingAmount,
            remainingAmount
        });
    } catch (error) {
        console.error('Error in createReceivedDetails:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};

exports.getAllReceivedDetails = async (req, res) => {
    try {

        const { search, driverId, month, year } = req.query

        const query = {};

        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId)
        }
        // Month and Year filter
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }
        if (search && search.trim()) {
            const searchQuery = search.trim();
            const regex = new RegExp(searchQuery, 'i');

            const searchConditions = [
                { fileNumber: regex },
            ];

            const [matchingDrivers, matchingProviders] = await Promise.all([
                Driver.find({ name: regex }).select('_id').lean(),
                Provider.find({ name: regex }).select('_id').lean(),
            ]);

            if (matchingDrivers.length > 0) {
                searchConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } });
            }
            if (matchingProviders.length > 0) {
                searchConditions.push({ provider: { $in: matchingProviders.map(p => p._id) } });
            }

            query.$or = searchConditions;
        }
        const receivedDetails = await ReceivedDetails
            .find(query)
            .sort({ createdAt: -1 })
            .populate('driver')

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
// Controller/cashReceivedDetails.js

exports.getStaffReceivedDetails = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { month, year, search } = req.query;

        // Validate staffId
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: 'Invalid staff ID' });
        }
        const staffObjectId = new mongoose.Types.ObjectId(staffId);

        // Base query with $or for both current and previous receivers
        const baseQuery = {
            $or: [
                {
                    $and: [
                        { receivedUserId: staffObjectId },
                        { receivedUser: 'Staff' }
                    ]
                },
                {
                    $and: [
                        { previousReceivedUserId: staffObjectId },
                        { previousReceivedUser: 'Staff' }
                    ]
                }
            ]
        };

        // Date filtering
        const dateFilter = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            dateFilter.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            dateFilter.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Search functionality - should ADD TO not REPLACE the base query
        const searchFilter = {};
        if (search && search.trim()) {
            const searchQuery = search.trim();
            const regex = new RegExp(searchQuery, 'i');

            searchFilter.$or = [
                { fileNumber: regex },
                { remark: regex },
                { amount: regex }
            ];
        }

        // Combine all filters
        const query = {
            $and: [
                baseQuery,
                dateFilter,
                ...(search && search.trim() ? [searchFilter] : [])
            ]
        };

        const receivedDetails = await ReceivedDetails.find(query)
            .sort({ createdAt: -1 })
            .populate('driver')
            .populate({
                path: 'receivedUserId',
                select: 'name'
            });

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error('Error fetching staff received details:', error);
        res.status(500).json({
            message: 'Internal Server Error',
            error: error.message
        });
    }
};