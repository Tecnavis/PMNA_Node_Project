const Driver = require('../Model/driver');
const Booking = require('../Model/booking');

async function calculateNetTotalAmountInHand(driverId) {
    console.log("working", driverId)
    const result = await Booking.aggregate([
        {
            $match: {
                driver: driverId,
                cashPending: false,
                status: 'Order Completed',
                workType: 'PaymentWork'
            }
        },
        {
            $group: {
                _id: null,
                netTotalAmount: {
                    $sum: {
                        $subtract: ['$totalAmount', '$receivedAmount']
                    }
                }
            }
        }
    ]);
    console.log(result)
    return result[0]?.netTotalAmount || 0;
}

async function calculateTotalSalary(driverId) {
    const result = await Booking.aggregate([
        {
            $match: {
                driver: driverId,
                verified: true,
            }
        },
        {
            $group: {
                _id: null,
                totalSalary: {
                    $sum: '$driverSalary'
                }
            }
        }
    ]);

    return result[0]?.totalSalary || 0;
}

async function updateDriverFinancials(driverId) {
    const netTotalAmount = await calculateNetTotalAmountInHand(driverId);
    const totalSalary = await calculateTotalSalary(driverId);

    const updatedDriver = await Driver.findByIdAndUpdate(
        driverId,
        {
            cashInHand: netTotalAmount,
            driverSalary: totalSalary,
        },
        { new: true }
    );

    return updatedDriver;
}

module.exports = {
    calculateNetTotalAmountInHand,
    updateDriverFinancials,
};
