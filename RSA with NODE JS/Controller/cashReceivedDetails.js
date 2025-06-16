const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')
const Booking = require('../Model/booking.js')
const Advance = require('../Model/advance.js')
const Provider = require('../Model/provider');
const { default: mongoose } = require('mongoose');
const Staff = require('../Model/staff');

// ----------------------
exports.createReceivedDetails = async (req, res) => {
    try {
        const { amount, currentNetAmount, driver, receivedAmount, remark,totalAmount } = req.body;
  const userId = req.user.id || req.user._id;
        const receivedUser = req.user.role; // Assuming role is stored in the user object
        const receivedUserId = userId; // The user creating the record

        if (!amount || !currentNetAmount || !driver || !receivedAmount) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const associateDriver = await Driver.findById(driver)
        if (!associateDriver) {
            return res.status(404).json({ message: 'Driver not found' });
        }
        console.log('found driver', associateDriver.name)
        let remainingAmount = receivedAmount;
        const selectedBookingIds = [];

        // fetch all related bookings
        const bookings = await Booking.find({
            status: 'Order Completed',
            driver,
            workType: 'PaymentWork',
             cashPending: false,
            $expr: { $gt: ["$totalAmount", "$receivedAmount"] }
        }).sort({ createdAt: 1 })
        console.log("booking", bookings.length)
        const updatedBookings = bookings.map(async (booking) => {

            const bookingBalance = booking.totalAmount - (booking.receivedAmount || 0);

            if (remainingAmount > 0 && bookingBalance > 0) {
                const appliedAmount = Math.min(remainingAmount, bookingBalance);
    if (receivedUser === 'Staff') {
        // For Staff payments:
        booking.receivedAmount = 0; // Set receivedAmount to 0 for Staff
        booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + appliedAmount;
    } else {
        // For non-Staff payments (Admin, etc.):
        booking.receivedAmount = (booking.receivedAmount || 0) + appliedAmount;
    }                   booking.receivedUser = receivedUser; // Set receivedUser
                booking.receivedUserId = new mongoose.Types.ObjectId(receivedUserId); // Set receivedUserId
                remainingAmount -= appliedAmount;
                selectedBookingIds.push(booking._id);
                await booking.save();
            }
            console.log('received amount decremnet ', remainingAmount)
            return booking
        })

        if (remainingAmount > 0) {
            console.log("still remain the recedvvined amount", remainingAmount)
            const currentAdvance = associateDriver.advance || 0;
            const newAdvance = Math.max(0, currentAdvance - remainingAmount);
            associateDriver.advance = newAdvance;
            await associateDriver.save();

            const [lastAdvance] = await Advance.find().sort({ createdAt: -1 }).limit(1);
            const driverAdvance = lastAdvance.advance;
            if (lastAdvance) {
                const updatedAdvance = Math.max(0, lastAdvance.advance - remainingAmount);
                lastAdvance.advance = updatedAdvance;
                await lastAdvance.save();
            }
            const receivedDetails = await ReceivedDetails.create({
                remark,
                balance: newAdvance,
                fileNumber: 'Advance Deduction',
                currentNetAmount: 0,
                amount: `Advance: ${driverAdvance}`,
                driver: associateDriver._id,
                receivedAmount: remainingAmount,
                totalAmount: totalAmount,
                receivedUser,

                receivedUserId,
            });
        }

        for (let bookingId of selectedBookingIds) {
            const booking = await Booking.findById(bookingId);
            const currentReceivedAmount = booking.receivedAmount || 0;
            const balance = (booking.totalAmount - currentReceivedAmount).toString();

            const receivedDetails = await ReceivedDetails.create({
                remark,
                balance: balance,
                fileNumber: booking.fileNumber,
                currentNetAmount: balance,
                amount: booking.totalAmount,
                driver: associateDriver._id,
                receivedAmount: currentReceivedAmount,
                  totalAmount: totalAmount,
                receivedUser,

                receivedUserId,
            });
            console.log('receivedDetails ', receivedDetails)
        }

        res.status(201).json({ message: 'Received details created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.getAllReceivedDetails = async (req, res) => {
    try {

        const { search, driverId , month, year} = req.query

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

        const query = {
            receivedUserId: new mongoose.Types.ObjectId(staffId),
            receivedUser: 'Staff' // Ensure we only get staff records
        };

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
            
            query.$or = [
                { fileNumber: regex },
                { remark: regex },
                { amount: regex }
            ];
        }

        const receivedDetails = await ReceivedDetails.find(query)
            .sort({ createdAt: -1 })
            .populate('driver')
            .populate({
                path: 'receivedUserId',
                select: 'name' // Only get staff name
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