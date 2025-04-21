const Booking = require('../Model/booking');

async function calculateNetTotalAmountInHand(companyId) {
    const result = await Booking.aggregate([
        {
            $match: {
                company: companyId,
                cashPending: false,
                status: 'Order Completed',
                workType: 'RSAWork'
            }
        },
        {
            $group: {
                _id: null,
                netTotalAmount: { $sum: '$totalAmount' }
            }
        }
    ]);
    return result[0]?.netTotalAmount || 0;
}

module.exports = {
    calculateNetTotalAmountInHand
}