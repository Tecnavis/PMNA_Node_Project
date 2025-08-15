const Driver = require('../Model/driver');
const Booking = require('../Model/booking');
const Expense = require('../Model/expense');
const DieselExpense = require('../Model/dieselExpense');
const Advance = require('../Model/advance');
const { distributeReceivedAmount } = require('./bookingService');
const { default: mongoose } = require('mongoose');
async function getValidDateRange(driverId) {
    const driver = await Driver.findById(driverId)
        .select('previousSettlementCompletedDate settlementCompletedDate')
        .lean();

    if (!driver) {
        throw new Error('Driver not found');
    }

    const now = new Date();

    // If dates are invalid or missing, use current month's start date as startDate and current date as endDate
    if (!driver.settlementCompletedDate) {
        return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: now
        };
    }

    // Always use current date as endDate, and settlementCompletedDate as startDate
    return {
        startDate: driver.settlementCompletedDate,
        endDate: now
    };
}
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
// ..........................................................................................................
async function calculateNetTotalAmountInHand(driverId) {
    // First aggregation for regular bookings
    const result = await Booking.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                status: 'Order Completed',
                workType: 'PaymentWork',
                // STRICTLY exclude cashPending=true cases
                $and: [
                    {
                        $or: [
                            { cashPending: false },
                            { cashPending: { $exists: false } }
                        ]
                    },
                    {
                        $or: [
                           
                            {
                                $nor: [
                                    { receivedUser: { $in: ['Admin', 'Staff'] } },
                                    { previousReceivedUser: { $in: ['Admin', 'Staff'] } }
                                ]
                            }
                        ]
                    },

                    {
                        $or: [
                            // Non-staff cases
                            { receivedUser: { $nin: ['Staff', 'Admin'] } },
                            { receivedUser: { $exists: false } },
                            // Staff cases (current or previous)
                            {
                                $or: [
                                    {
                                        $and: [
                                            { receivedUser: 'Staff' },
                                            { partialReceivedAmountStaff: true }
                                        ]
                                    },
                                    {
                                        $and: [
                                            { previousReceivedUser: 'Staff' },
                                            { partialPayment: false }
                                        ]
                                    }
                                ]
                            },
                            // Driver cases with multipleReceivedUser
                            {
                                $and: [
                                    { multipleReceivedUser: true },
                                    {
                                        $or: [
                                            { receivedUser: 'Driver' },
                                            { previousReceivedUser: 'Driver' }

                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        },
       {
    $addFields: {
        effectiveReceivedAmount: {
            $cond: [
                {
                    $or: [
                        // Staff cases
                        {
                            $and: [
                                { $eq: ["$receivedUser", "Staff"] },
                                { $eq: ["$partialReceivedAmountStaff", true] }
                            ]
                        },
                        {
                            $and: [
                                { $eq: ["$previousReceivedUser", "Staff"] },
                                { $eq: ["$partialPayment", false] }
                            ]
                        },
                        // Driver cases with multipleReceivedUser
                        {
                            $and: [
                                { $eq: ["$multipleReceivedUser", true] },
                                {
                                    $or: [
                                        { $eq: ["$receivedUser", "Driver"] },
                                        { $eq: ["$previousReceivedUser", "Driver"] }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    $cond: [
                        {
                            $or: [
                                { $eq: ["$receivedUser", "Staff"] },
                                { $eq: ["$previousReceivedUser", "Staff"] }
                            ]
                        },
                        "$receivedAmountStaff",  // Use receivedAmountStaff for Staff cases
                        "$receivedAmountDriver"  // Use receivedAmountDriver for Driver cases
                    ]
                },
                "$receivedAmount"  // Default case
            ]
        }
    }
},
        {
            $group: {
                _id: null,
                netTotalAmount: {
                    $sum: {
                        $subtract: ["$totalAmount", "$effectiveReceivedAmount"]
                    }
                }
            }
        }
    ]);

    // Second aggregation for partial payment bookings (cashPending true)
    const partialPaymentResult = await Booking.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: true,
                partialPayment: true,
                receivedUser:'Driver'
            }
        },
        {
            $addFields: {
                // For partial payment bookings, we use receivedAmountDriver as the target amount
                amountDue: {
                    $subtract: ["$receivedAmountDriver", "$receivedAmount"]
                }
            }
        },
        {
            $group: {
                _id: null,
                netPartialAmount: {
                    $sum: {
                        $cond: [
                            { $gt: ["$amountDue", 0] },  // Only include if there's amount due
                            "$amountDue",
                            0
                        ]
                    }
                }
            }
        }
    ]);
 const firstCasePaymentResult = await Booking.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: false,
                receivedUser: 'Driver',
                 previousReceivedUser: 'Staff'
                 },
            
        },
        {
            $addFields: {
                // For partial payment bookings, we use receivedAmountDriver as the target amount
                amountDue: {
                    $subtract: ["$receivedAmountDriver", "$receivedAmount"]
                }
            }
        },
        {
            $group: {
                _id: null,
                netFirstCaseAmount: {
                    $sum: {
                        $cond: [
                            { $gt: ["$amountDue", 0] },  // Only include if there's amount due
                            "$amountDue",
                            0
                        ]
                    }
                }
            }
        }
    ]);
    // third case
      const thirdCasePaymentResult = await Booking.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: false,
                receivedUser:'Staff',
                previousReceivedUser:"Driver",
                givenAmountByStaff: 0,
            }
        },
        {
            $addFields: {
                // For partial payment bookings, we use receivedAmountDriver as the target amount
                amountDue: {
                    $subtract: ["$receivedAmountDriver", "$receivedAmount"]
                }
            }
        },
        {
            $group: {
                _id: null,
                netThirdCaseAmount: {
                    $sum: {
                        $cond: [
                            { $gt: ["$amountDue", 0] },  // Only include if there's amount due
                            "$amountDue",
                            0
                        ]
                    }
                }
            }
        }
    ]);
  
        // new condition................................
         const newCasePaymentResult = await Booking.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                status: 'Order Completed',
                workType: 'PaymentWork',
                cashPending: false,
                receivedUser:'Driver',
                previousReceivedUser:"Staff",
                receivedAmount: 0,
            }
        },
        {
            $addFields: {
                // For partial payment bookings, we use receivedAmountDriver as the target amount
                amountDue: {
                    $subtract: ["$receivedAmountDriver", "$receivedAmount"]
                }
            }
        },
        {
            $group: {
                _id: null,
                netNewCaseAmount: {
                    $sum: {
                        $cond: [
                            { $gt: ["$amountDue", 0] },  // Only include if there's amount due
                            "$amountDue",
                            0
                        ]
                    }
                }
            }
        }
    ]);

    return (
        (result[0]?.netTotalAmount || 0) +
        (partialPaymentResult[0]?.netPartialAmount || 0)+
        (firstCasePaymentResult[0]?.netFirstCaseAmount || 0)+
         (thirdCasePaymentResult[0]?.netThirdCaseAmount || 0)+
           (newCasePaymentResult[0]?.netNewCaseAmount || 0)
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
    const result = await Expense.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                approve: true,
                settled: { $ne: true } // Only include unsettled expenses
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
    console.log("result", result)
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

    const { startDate, endDate } = await getValidDateRange(driverId);

    const result = await Advance.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                userModel: "Driver",
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
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
