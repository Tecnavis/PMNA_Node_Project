const Staff = require('../Model/staff');
const Booking = require('../Model/booking');
const ReceivedDetails = require('../Model/ReceivedDetails');
const mongoose = require('mongoose');

async function calculateTotalAmount(staffId) {
    try {
        const result = await Booking.aggregate([
            {
                $match: {
                    receivedUserId: staffId,
                    receivedUser: 'Staff',
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
                            $subtract: [
                                '$receivedAmountStaff',
                                { $ifNull: ['$givenAmountByStaff', 0] }
                            ]
                        }
                    }
                }
            }
        ]);
        return result[0]?.netTotalAmount || 0;
    } catch (error) {
        console.error('Error calculating net total amount:', error);
        return 0;
    }
}

async function calculateReceivedTotalAmount(staffId) {
    console.log("calculateReceivedTotalAmount staffId:", staffId);
    try {
        // First verify the fields exist and are numbers
        const sampleDoc = await ReceivedDetails.findOne({
            receivedUserId: staffId,
            receivedUser: 'Staff',
            fileNumber: 'Advance Deduction'
        });

        if (sampleDoc) {
            console.log('Sample document fields:', {
                receivedAmount: sampleDoc.receivedAmount,
                balance: sampleDoc.balance,
                receivedAmountType: typeof sampleDoc.receivedAmount,
                balanceType: typeof sampleDoc.balance
            });
        }

        const result = await ReceivedDetails.aggregate([
            {
                $match: {
                    receivedUserId: new mongoose.Types.ObjectId(staffId),
                    receivedUser: 'Staff',
                    fileNumber: 'Advance Deduction'
                }
            },
            {
                $project: {
                    // Convert to numbers if they might be strings
                    receivedAmount: { $toDouble: "$receivedAmount" },
                    balance: { $toDouble: "$balance" }
                }
            },
            {
                $group: {
                    _id: null,
                    netTotalAmount: {
                        $sum: {
                            $add: [
                                { $ifNull: ["$receivedAmount", 0] },
                                { $ifNull: ["$balance", 0] }
                            ]
                        }
                    }
                }
            }
        ]);

        console.log('--- Received Details Aggregation Results ---');
        console.log('Full aggregation result:', JSON.stringify(result, null, 2));
        
        const total = result[0]?.netTotalAmount || 0;
        console.log('Calculated netTotalAmount:', total);
        console.log('--- End of Results ---');
        
        return total;
    } catch (error) {
        console.error('Error calculating received total amount:', {
            error: error.message,
            stack: error.stack,
            staffId: staffId
        });
        return 0;
    }
}

async function calculateNetTotalAmountInHand(staffId) {
    try {
        const [netAmount, receivedAmount] = await Promise.all([
            calculateTotalAmount(staffId),
            calculateReceivedTotalAmount(staffId)
        ]);

        console.log('Combined Calculation Results:', {
            fromBookings: netAmount,
            fromReceivedDetails: receivedAmount,
            combinedTotal: netAmount + receivedAmount
        });

        return netAmount + receivedAmount;
    } catch (error) {
        console.error('Error in combined calculation:', error);
        return 0;
    }
}

module.exports = {
    calculateTotalAmount,
    calculateReceivedTotalAmount,
     calculateNetTotalAmountInHand
};