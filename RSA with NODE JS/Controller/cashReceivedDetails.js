const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')
const Booking = require('../Model/booking.js')
const Advance = require('../Model/advance.js')
const Provider = require('../Model/provider');
const { default: mongoose } = require('mongoose');
const Staff = require('../Model/staff');

exports.createReceivedDetails = async (req, res) => {
    try {
        const { amount, currentNetAmount, driver, provider, receivedAmount, remark, totalAmount } = req.body;
        const userId = req.user.id || req.user._id;
        const userRole = req.user.role || req.user?.user?.role;
        const receivedUserId = userId;

        if (!amount || !receivedAmount || (!driver && !provider)) {
            return res.status(400).json({ message: 'All required fields are missing' });
        }

        // Determine if we're working with a driver or provider
        const isDriver = !!driver;
        const associateEntity = isDriver 
            ? await Driver.findById(driver) 
            : await Provider.findById(provider);

        if (!associateEntity) {
            return res.status(404).json({ 
                message: isDriver ? 'Driver not found' : 'Provider not found' 
            });
        }

        // Add validation for Staff role
        if (userRole === 'Staff') {
            const cashInHand = associateEntity.cashInHand || 0;
if (Math.abs(Number(receivedAmount) - cashInHand) > 0.01) {                return res.status(400).json({ 
                    message: `For Staff, received amount must match ${isDriver ? 'driver' : 'provider'}'s cash in hand (${cashInHand})` 
                });
            }
        }

        let remainingAmount = receivedAmount;
        const selectedBookingIds = [];

        // Fetch bookings including partially received Staff payments and non-Staff payments
        const bookingQuery = {
            status: 'Order Completed',
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
        };

        // Add driver/provider to query
        if (isDriver) {
            bookingQuery.driver = driver;
        } else {
            bookingQuery.provider = provider;
        }

        const bookings = await Booking.find(bookingQuery).sort({ createdAt: 1 });

        // Update bookings by distributing receivedAmount
        for (const booking of bookings) {
            if (remainingAmount <= 0) break;
            
            const previousReceivedUser = booking.receivedUser;
            const previousReceivedUserId = booking.receivedUserId;

            let bookingBalance;
            if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff === true) {
                bookingBalance = booking.totalAmount - (booking.receivedAmountStaff || 0);
            } else {
                bookingBalance = booking.totalAmount - (booking.receivedAmount || 0);
            }

            if (bookingBalance > 0) {
                const appliedAmount = Math.min(remainingAmount, bookingBalance);

                if (booking.receivedUser === 'Staff' && booking.partialReceivedAmountStaff === true) {
                    if (userRole === 'Staff') {
                        booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + appliedAmount;
                    } else {
                        booking.receivedAmount = (booking.receivedAmountStaff || 0) + appliedAmount;
                    }

                    const totalReceived = booking.receivedUser === 'Staff'
                        ? (booking.receivedAmountStaff || 0)
                        : (booking.receivedAmount || 0);

                    if (Math.abs(totalReceived - booking.totalAmount) < 0.01) {
                        booking.partialReceivedAmountStaff = false;
                        booking.receivedAmount = booking.totalAmount;
                        if (booking.receivedUser === 'Staff') {
                            booking.receivedAmountStaff = booking.totalAmount;
                        }
                    } else {
                        booking.partialReceivedAmountStaff = true;
                    }
                } else {
                    booking.receivedAmount = (booking.receivedAmount || 0) + appliedAmount;

                    if (userRole === 'Staff') {
                        booking.receivedAmountStaff = appliedAmount;
                        booking.partialReceivedAmountStaff = (booking.receivedAmount || 0) < booking.totalAmount;
                    }

                    if (Math.abs(booking.receivedAmount - booking.totalAmount) < 0.01) {
                        booking.partialReceivedAmountStaff = false;
                    }
                }

                if (previousReceivedUser !== userRole) {
                    booking.previousReceivedUser = previousReceivedUser;
                    booking.previousReceivedUserId = previousReceivedUserId;
                }

                booking.receivedUser = userRole;
                booking.receivedUserId = new mongoose.Types.ObjectId(receivedUserId);

                remainingAmount -= appliedAmount;
                selectedBookingIds.push(booking._id);
                await booking.save();
            }
        }

        // Deduct remaining amount from advance
        if (remainingAmount > 0) {
            const currentAdvance = associateEntity.advance || 0;
            const newAdvance = Math.max(0, currentAdvance - remainingAmount);
            associateEntity.advance = newAdvance;
            await associateEntity.save();

            const lastAdvance = await Advance.findOne({ 
                [isDriver ? 'driver' : 'provider']: associateEntity._id 
            }).sort({ createdAt: -1 });

            if (lastAdvance) {
                lastAdvance.advance = Math.max(0, lastAdvance.advance - remainingAmount);
                await lastAdvance.save();
            }

            await ReceivedDetails.create({
                remark,
                balance: newAdvance,
                fileNumber: 'Advance Deduction',
                currentNetAmount: 0,
                amount: `Advance: ${lastAdvance?.advance || 0}`,
                [isDriver ? 'driver' : 'provider']: associateEntity._id,
                receivedAmount: remainingAmount,
                totalAmount: totalAmount,
                receivedUser: userRole,
                receivedUserId,
            });
        }

        // Create received details for each updated booking
        for (const bookingId of selectedBookingIds) {
            const booking = await Booking.findById(bookingId);

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
                [isDriver ? 'driver' : 'provider']: associateEntity._id,
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
        const { search, driverId, providerId, month, year } = req.query;

        const query = {};

        // Handle either driver or provider
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
        } else if (providerId) {
            query.provider = new mongoose.Types.ObjectId(providerId);
        }

        // Date filtering
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        } else if (year) {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);
            query.createdAt = { $gte: startDate, $lte: endDate };
        }

        // Search functionality
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
            .populate('driver provider');

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getStaffReceivedDetails = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { month, year, search } = req.query;

        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: 'Invalid staff ID' });
        }
        const staffObjectId = new mongoose.Types.ObjectId(staffId);

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

        const query = {
            $and: [
                baseQuery,
                dateFilter,
                ...(search && search.trim() ? [searchFilter] : [])
            ]
        };

        const receivedDetails = await ReceivedDetails.find(query)
            .sort({ createdAt: -1 })
            .populate('driver provider')
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