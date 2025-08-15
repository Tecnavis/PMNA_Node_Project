const Booking = require('../Model/booking');

// Helper function to calculate total odometer for a vehicle
const calculateTotalOdometer = async (vehicleNumber) => {
    try {
        const bookings = await Booking.aggregate([
            {
                $match: {
                    status: 'Order Completed',
                    'driverVehicle.vehicleNumber': vehicleNumber,
                    $or: [
                        { vehicleServiceDue: { $exists: false } },
                        { vehicleServiceDue: false }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalDistance: { $sum: '$totalDriverDistence' }
                }
            }
        ]);

        return bookings.length > 0 ? bookings[0].totalDistance : 0;
    } catch (error) {
        console.error('Error calculating total odometer:', error);
        return 0;
    }
};

