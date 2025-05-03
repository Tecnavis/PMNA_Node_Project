const Driver = require('../Model/driver');
const Booking = require('../Model/booking');
const Expense = require('../Model/expense');
const DieselExpense = require('../Model/dieselExpense');
const { distributeReceivedAmount } = require('./bookingService');

const getTotalDriverExpense = async (driverId) => {
    const result = await Expense.aggregate([
        {
            $match: {
                driver: driverId,
                approve: true
            }
        },
        {
            $group: {
                _id: null,
                totalExpense: { $sum: '$amount' }
            }
        }
    ]);

    return result[0]?.totalExpense || 0;
}
// Calculating the net total amount in hand 
async function calculateNetTotalAmountInHand(driverId) {

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
    const result2 = await Booking.aggregate([
        {
            $match: {
                driver: driverId,
                partialPayment: true,
                workType: 'PaymentWork'
            }
        },
        {
            $group: {
                _id: null,
                netTotalAmount2: {
                    // $sum: {
                    //     $subtract: ['$totalAmount', '$partialAmount']
                    // }
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
// Update financial values in driver side
async function updateDriverFinancials(driverId, advance = 0) {
    const netTotalAmount = await calculateNetTotalAmountInHand(driverId);
    const totalSalary = await calculateTotalSalary(driverId);

    const balance = calculateBalanceAmount(netTotalAmount, totalSalary) || 0
    const expense = await calculateMonthlyExpense(driverId);
    const totalExpense = await calculateTotalExpense(driverId);
    const dieselExpense = await calculateMonthlyDieselExpense(driverId);

    const finalCashInHand = netTotalAmount + advance
    const updatedDriver = await Driver.findByIdAndUpdate(
        driverId,
        {
            cashInHand: finalCashInHand,
            driverSalary: totalSalary,
            balanceAmount: balance,
            dieselExpense,
            expense,
            totalExpense
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
// Calculating the current monthlyExpense
async function calculateMonthlyExpense(driverId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await Expense.aggregate([
        {
            $match: {
                driver: driverId,
                approve: true,
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            }
        },
        {
            $group: {
                _id: null,
                monthlyExpense: { $sum: '$amount' }
            }
        },
        {
            $project: {
                _id: 0,
                monthlyExpense: 1
            }
        }
    ]);

    return result[0]?.monthlyExpense || 0;
}
// Calculating the current monthlyExpense
async function calculateTotalExpense(driverId) {

    const result = await Expense.aggregate([
        {
            $match: {
                driver: driverId,
                approve: true,
            }
        },
        {
            $group: {
                _id: null,
                monthlyExpense: { $sum: '$amount' }
            }
        },
        {
            $project: {
                _id: 0,
                monthlyExpense: 1
            }
        }
    ]);

    return result[0]?.monthlyExpense || 0;
}

// Function for calculate the monthly diesel expense
async function calculateMonthlyDieselExpense(driverId) {

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await DieselExpense.aggregate([
        {
            $match: {
                driver: driverId,
                status: 'Approved',
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            }
        },
        {
            $group: {
                _id: null,
                monthlyDieselExpense: { $sum: '$amount' }
            }
        },
        {
            $project: {
                _id: 0,
                monthlyDieselExpense: 1
            }
        }
    ]);
    return result[0]?.monthlyDieselExpense || 0;

}

module.exports = {
    calculateNetTotalAmountInHand,
    updateDriverFinancials,
};
