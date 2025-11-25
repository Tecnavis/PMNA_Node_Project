const Booking = require('../Model/booking');
const Vehicle = require('../Model/vehicle');

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

exports.updateServiceKm = async (vehicleNumber, serviceKM) => {
    if (!serviceKM && serviceKM !== 0) {
        const error = new Error("serviceKM is required");
        error.status = 400;
        throw error;
    }

    const vehicle = await Vehicle.findOneAndUpdate(
        { serviceVehicle: vehicleNumber },
        { $set: { serviceKM } },
        { new: true }
    );

    if (!vehicle) {
        const error = new Error("Vehicle not found");
        error.status = 404;
        throw error;
    }

    return vehicle;
};

exports.getVehicleByVehicleName = async (vehicleNumber) => {
    if (!vehicleNumber) {
        const error = new Error("vehicleNumber is required");
        error.status = 400;
        throw error;
    }
        const vehicle = await Vehicle.findOne(
        { serviceVehicle: vehicleNumber }
    );

    if (!vehicle) {
        const error = new Error("Vehicle not found");
        error.status = 404;
        throw error;
    }

    return vehicle;
}