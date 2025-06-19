const Driver = require('../Model/driver');
const Booking = require('../Model/booking');
const Expense = require('../Model/expense');
const DieselExpense = require('../Model/dieselExpense');
const Advance = require('../Model/advance');
const { distributeReceivedAmount } = require('./bookingService');
const { default: mongoose } = require('mongoose');

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
                status: 'Order Completed',
                workType: 'PaymentWork',
                $or: [
                    { cashPending: false },
                    { cashPending: { $exists: false } }
                ],
                // Add this condition to exclude Staff-received bookings
                $and: [
                    {
                        $or: [
                            { receivedUser: { $ne: 'Staff' } },
                            { receivedUser: { $exists: false } }
                        ]
                    }
                ]
            }
        },
       {
    $group: {
        _id: null,
        netTotalAmount: {
            $sum: {
                $subtract: ["$totalAmount", "$receivedAmount"]
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
                driverTotalSalary: {
                    $sum: '$driverSalary'
                },
                driverTotalTransferdSalary: {
                    $sum: '$transferedSalary'
                }
            }
        },
        {
            $project: {
                _id: 0,
                actualSalary: {
                    $subtract: ['$driverTotalSalary', '$driverTotalTransferdSalary']
                }
            }
        }
    ]);
    return result[0]?.actualSalary || 0;
}
// Update financial values in driver side
async function updateDriverFinancials(driverId, advance = 0) {
    const netTotalAmount = await calculateNetTotalAmountInHand(driverId);
    const totalSalary = await calculateTotalSalary(driverId);

    const totalExpense = await calculateMonthlyExpense(driverId);
    const expense = await calculateTotalExpense(driverId);
    const dieselExpense = await calculateMonthlyDieselExpense(driverId);
    const monthlySalary = await calculateMonthlySalary(driverId);
    const monthlyAdvance = await calculateTotalAdvance(driverId);

    const finalCashInHand = netTotalAmount + advance
    const balance = calculateBalanceAmount(finalCashInHand, totalSalary) || 0
     // Prepare the update object
    const updateData = {
        cashInHand: finalCashInHand,
        driverSalary: totalSalary,
        balanceAmount: balance,
        dieselExpense,
        expense,
        totalExpense,
        totalSalary: monthlySalary,
        totalAdvance: monthlyAdvance,
    };

    // Add settlement condition
    // if (totalExpense !== 0) {
    //     updateData.settlement = false;
    // }

    const updatedDriver = await Driver.findByIdAndUpdate(
        driverId,
        updateData,
        { new: true }
    );

    return updatedDriver;
}

// Function for update driver balance amount (balance amount to give to admin)
function calculateBalanceAmount(cashInHand, driverSalary) {
    return cashInHand - driverSalary
}
async function calculateMonthlyExpense(driverId) {
    // First get the driver's settlement dates
    const driver = await Driver.findById(driverId)
        .select('previousSettlementCompletedDate settlementCompletedDate')
        .lean();

    if (!driver) {
        throw new Error('Driver not found');
    }

    // Use settlement dates if available, otherwise fall back to current month
    const startDate = driver.previousSettlementCompletedDate || 
                     new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const endDate = driver.settlementCompletedDate || 
                   new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    // Validate dates
    if (startDate > endDate) {
        throw new Error('Invalid date range: previousSettlementCompletedDate is after settlementCompletedDate');
    }

    const result = await Expense.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                approve: true,
                $or: [
                    // Expenses created between settlements
                    { 
                        createdAt: { 
                            $gte: startDate,
                            $lte: endDate 
                        } 
                    },
                    // Or expenses approved between settlements (if you track approval date)
                    { 
                        approvedDate: { 
                            $gte: startDate,
                            $lte: endDate 
                        } 
                    }
                ]
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
                status: 'approved',
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
async function calculateTotalAdvance(driverId) {

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await Advance.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                userModel: "Driver",
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            }
        },
        {
            $group: {
                _id: null,
                totalMonthlyAdvance: { $sum: '$addedAdvance' }
            }
        },
    ]);
    return result[0]?.totalMonthlyAdvance || 0;

}
async function calculateMonthlySalary(driverId) {

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const result = await Booking.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                verified: true,
                createdAt: {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                }
            }
        },
        {
            $group: {
                _id: null,
                totalMonthlySalary: { $sum: '$driverSalary' }
            }
        },
    ]);
    return result[0]?.totalMonthlySalary || 0;

}

module.exports = {
    calculateNetTotalAmountInHand,
    updateDriverFinancials,
};
