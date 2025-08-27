const Showroom = require('../Model/showroom');
const Booking = require('../Model/booking');
const { default: mongoose } = require('mongoose');

// ..........................................................................................................
async function calculateNetTotalAmountInHandShowroom(showroomId) {
    try {
        // First aggregation for regular bookings
        const result = await Booking.aggregate([
            {
                $match: {
                    showroom: new mongoose.Types.ObjectId(showroomId),
                    status: 'Order Completed',
                    workType: 'PaymentWork',
                }
            },
            {
                $addFields: {
                    effectiveReceivedAmount: {
                        $ifNull: ["$receivedAmountShowroom", 0] // Handle null/undefined values
                    },
                    effectiveShowroomAmount: {
                        $ifNull: ["$showroomAmount", 0] // Handle null/undefined values
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    netTotalAmount: {
                        $sum: {
                            $subtract: ["$effectiveShowroomAmount", "$effectiveReceivedAmount"]
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

// Update financial values in showroom side
async function updateShowroomFinancials(showroomId) { // Added showroomId parameter
    try {
        const cashInHand = await calculateNetTotalAmountInHandShowroom(showroomId);
        
        // Prepare the update object
        const updateData = {
            cashInHand,
        };

        const updatedShowroom = await Showroom.findByIdAndUpdate(
            showroomId,
            updateData,
            { new: true }
        );

        return updatedShowroom;
    } catch (error) {
        console.error('Error updating showroom financials:', error);
        throw error;
    }
}

module.exports = {
    calculateNetTotalAmountInHandShowroom,
    updateShowroomFinancials,
};