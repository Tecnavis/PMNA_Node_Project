const Provider = require('../Model/provider');
const Booking = require('../Model/booking');

// Calculating the net total amount in hand 
async function calculateNetTotalAmountInHand(providerId) {

    const result = await Provider.aggregate([
        {
            $match: {
                provider: providerId,
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
    const result2 = await Booking.aggregate([
        {
            $match: {
                provider: providerId,
                partialPayment: true,
                workType: 'PaymentWork'
            }
        },
        {
            $group: {
                _id: null,
                netTotalAmount2: {
                    $sum: '$partialAmount'
                }
            }
        }
    ]);

    return (
        (result[0]?.netTotalAmount || 0) +
        (result2[0]?.netTotalAmount2 || 0)
    );
}
// Calculate the driver total salary from verified bookings
async function calculateTotalSalary(providerId) {
    const result = await Booking.aggregate([
        {
            $match: {
                provider: providerId,
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
// Update financial values in driver side
async function updateProviderFinancials(providerId, advance = 0) {
    const netTotalAmount = await calculateNetTotalAmountInHand(providerId);
    const totalSalary = await calculateTotalSalary(providerId);

    const balance = calculateBalanceAmount(netTotalAmount, totalSalary) || 0

    const finalCashInHand = netTotalAmount + advance
    const updatedDriver = await Provider.findByIdAndUpdate(
        providerId,
        {
            cashInHand: finalCashInHand,
            driverSalary: totalSalary,
            balanceAmount: balance,
        },
        { new: true }
    );

    return updatedDriver;
}

// Function for update driver balance amount (balance amount to give to admin)
function calculateBalanceAmount(cashInHand, driverSalary) {
    if (cashInHand <= 0 || cashInHand < driverSalary) {
        return 0
    }
    return cashInHand - driverSalary
}

module.exports = {
    updateProviderFinancials,
};
