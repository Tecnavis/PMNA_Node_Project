var Bookings = require('../Model/booking')
var TaxInsurance = require('../Model/taxInsurance')

exports.dashboard = async (req, res) => {
    try {

        // Aggregation for dashboard data(counting document based on the condition)
        const pipeline = [
            {
                $group: {
                    _id: null,
                    newBookingsShowRoom: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "booking added"] }, { $eq: ["$bookingStatus", "ShowRoom Booking"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    newBookingsOther: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$status", "booking added"] }, { $ne: ["$bookingStatus", "ShowRoom Booking"] }] },
                                1,
                                0
                            ]
                        }
                    },
                    pendingBookings: {
                        $sum: {
                            $cond: [
                                {
                                    $in: [
                                        "$status",
                                        [
                                            "called to customer",
                                            "Order Received",
                                            "On the way to pickup location",
                                            "Vehicle Picked",
                                            "Vehicle Confirmed",
                                            "To DropOff Location",
                                            "On the way to dropoff location",
                                            "Vehicle Dropped"
                                        ]
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    completedBookings: {
                        $sum: {
                            $cond: [
                                { $eq: ["$status", "Order Completed"] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }

        ]
        const newBookings = await Bookings.aggregate(pipeline);

        const today = new Date();

        //Fetching the data from database in javascript json formate
        const expiredRecords = await TaxInsurance.find({}).lean();

        //Create individual array item for expired records
        const filteredRecords = expiredRecords.flatMap((record) => {
            const expiredFields = [];
            
            if (!record.emiDue && record.emiExpiryDate < today) {
                expiredFields.push({
                    type: "EMI",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.emiExpiryDate,
                });
            }
            if (!record.insuranceDue && record.insuranceExpiryDate < today) {
                expiredFields.push({
                    type: "Insurance",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.insuranceExpiryDate,
                });
            }
            if (!record.pollutionDue && record.pollutionExpiryDate < today) {
                expiredFields.push({
                    type: "Pollution",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.pollutionExpiryDate,
                });
            }
            if (!record.taxDue && record.taxExpiryDate < today) {
                expiredFields.push({
                    type: "Tax",
                    vehicleNumber: record.vehicleNumber,
                    expiryDate: record.taxExpiryDate,
                });
            }

            return expiredFields;
        });

        res.status(201).json({ bookingData: newBookings, records: filteredRecords })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Error fetching dashboard data', error });
    }
}

