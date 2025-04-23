const ReceivedDetails = require('../Model/ReceivedDetails.js')
const Driver = require('../Model/driver.js')
const Booking = require('../Model/booking.js')
const Advance = require('../Model/advance.js')


exports.createReceivedDetails = async (req, res) => {
    try {
        const { amount, currentNetAmount, driver, receivedAmount, remark } = req.body;
        
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
            workType : 'PaymentWork',
            $expr: { $gt: ["$totalAmount", "$receivedAmount"] }
        }).sort({ createdAt: 1 })
        console.log("booking", bookings.length)
        const updatedBookings = bookings.map(async (booking) => {

            const bookingBalance = booking.totalAmount - (booking.receivedAmount || 0);

            if (remainingAmount > 0 && bookingBalance > 0) {
                const appliedAmount = Math.min(remainingAmount, bookingBalance);
                booking.receivedAmount = (booking.receivedAmount || 0) + appliedAmount;
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
                balance :newAdvance,
                fileNumber: 'Advance Deduction',
                currentNetAmount: 0,
                amount: `Advance: ${driverAdvance}`,
                driver: associateDriver._id,
                receivedAmount: remainingAmount,
            });
        }

        for (let bookingId of selectedBookingIds) {
            const booking = await Booking.findById(bookingId);
            const currentReceivedAmount = booking.receivedAmount || 0;
            const balance = (booking.totalAmount - currentReceivedAmount).toString();

            const receivedDetails = await ReceivedDetails.create({
                remark,
                balance : balance,
                fileNumber: booking.fileNumber,
                currentNetAmount: balance,
                amount: booking.totalAmount,
                driver: associateDriver._id,
                receivedAmount: currentReceivedAmount,
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
        const receivedDetails = await ReceivedDetails
            .find()
            .sort({ createdAt: -1 })
            .populate('driver')

        res.status(200).json(receivedDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
