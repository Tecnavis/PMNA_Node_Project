const Staff = require('../Model/staff');
const Booking = require('../Model/booking');

async function calculateNetTotalAmountInHand(staffId) {
    const result = await Booking.aggregate([
        {
            $match: {
                receivedUserId: staffId,
                receivedUser:Staff,
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
                        $subtract: ['$receivedAmountStaff', '$givenAmountByStaff'] 
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