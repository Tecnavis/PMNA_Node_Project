const Booking = require('../Model/booking');

async function calculateNetTotalAmountInHand(companyId) {
    const result = await Booking.aggregate([
        {
            $match: {
                company: companyId,
                // cashPending: false,
                status: 'Order Completed',
                workType: 'RSAWork'
            }
        },
        {
            $group: {
                _id: null,
                netTotalAmount: {
                    $sum: {
                        $cond: {
                            if: { $gte: ['$receivedAmount', '$totalAmount'] }, // If receivedAmount is greater than or equal to totalAmount
                            then: 0, // Do not add anything (skip this value)
                            else: { $subtract: ['$totalAmount', '$receivedAmount'] } // Calculate difference if totalAmount > receivedAmount
                        }
                    }
                }
            }
        }

    ]); 
    return result[0]?.netTotalAmount || 0;
}

module.exports = {
    calculateNetTotalAmountInHand
}