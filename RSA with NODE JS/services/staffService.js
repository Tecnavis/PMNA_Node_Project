const Staff = require('../Model/staff');
const Booking = require('../Model/booking');

async function calculateNetTotalAmountInHand(staffId) {
    try {
        const result = await Booking.aggregate([
            {
                $match: {
                    receivedUserId: staffId,
                    receivedUser: 'Staff', // as a string
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
        return 0; // Return 0 in case of error
    }
}
module.exports = {
    calculateNetTotalAmountInHand
}