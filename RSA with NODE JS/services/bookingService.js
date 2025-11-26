const Booking = require('../Model/booking')
const Driver = require('../Model/driver.js')
const Advance = require('../Model/advance.js')
const ReceivedDetails = require('../Model/ReceivedDetails.js')

exports.distributeReceivedAmount = async (driver, receivedAmount, remark) => {
    try {
        const associateDriver = await Driver.findById(driver)
        if (!associateDriver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        let remainingAmount = receivedAmount;
        const selectedBookingIds = [];

        // fetch all related bookings
        const bookings = await Booking.find({
            status: 'Order Completed',
            driver,
            workType: 'PaymentWork',
            cashPending: false
        }).sort({ createdAt: 1 })

        const updatedBookings = bookings.map(async (booking) => {

            const bookingBalance = booking.totalAmount - (booking.receivedAmount || 0);

            if (remainingAmount > 0 && bookingBalance > 0) {
                const appliedAmount = Math.min(remainingAmount, bookingBalance);
                booking.receivedAmount = (booking.receivedAmount || 0) + appliedAmount;
                remainingAmount -= appliedAmount;
                selectedBookingIds.push(booking._id);
                await booking.save();
            }

            return booking
        })

        if (remainingAmount > 0) {

            const currentAdvance = associateDriver.advance || 0;
            const newAdvance = currentAdvance - remainingAmount
            associateDriver.advance = newAdvance;
            await associateDriver.save();

            const [lastAdvance] = await Advance.find().sort({ createdAt: -1 }).limit(1);
            const driverAdvance = lastAdvance.advance;
            if (lastAdvance) {
                const updatedAdvance = lastAdvance.advance - remainingAmount
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
                totalAmount: receivedAmount
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
                totalAmount: receivedAmount
            });

        }

        return { message: 'Received amount updated successfully' }
    } catch (error) {
        console.log(error, 'error from booking service.js ')
    }
}

// check and add field for booking enable or not enable
exports.chekcAndUpdatebookingIsEnable = (bookings) => {
    let now = new Date();

    return bookings.map((booking) => {
        if (booking.status !== 'Scheduled') {
            const pickupString = String(booking?.pickupDate).replace('Z', '');
            const pickup = new Date(pickupString);

            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const pickupDateOnly = new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate());

            // checking with pickup date is is today
            const isSameDay = nowDateOnly.getTime() === pickupDateOnly.getTime();

            let isPast = false;

            if (isSameDay) {
                // Same day -> compare time
                isPast = now.getTime() > pickup.getTime();
                booking.isEnable = isPast;
            }
        } else if (booking.status === 'Scheduled') {
            booking.isEnable = false;
        }
        return booking
    })
}