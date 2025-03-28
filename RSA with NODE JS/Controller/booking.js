const Booking = require('../Model/booking');
const Driver = require('../Model/driver'); // Import your Driver model
const Provider = require('../Model/provider'); // Import your Provider model
const Company = require('../Model/company'); // Import your Provider model
const mongoose = require('mongoose');
const Vehicle = require('../Model/vehicle');


// ------------------------------
// exports.createBooking = async (req, res) => {
//     try {
//         const { provider } = req.body;

//         // Ensure provider ID is provided
//         if (!provider) {
//             return res.status(400).json({ message: 'Provider ID is required' });
//         }

//         // Fetch provider details from database
//         const providerData = await Provider.findById(provider);

//         if (!providerData) {
//             return res.status(404).json({ message: 'Provider not found' });
//         }

//         // Check if cashInHand is less than creditAmountLimit
//         if (providerData.cashInHand < providerData.creditAmountLimit) {
//             return res.status(400).json({
//                 message: 'Booking not allowed. Provider cash in hand is below the credit amount limit.',
//             });
//         }

//         // Handle the case where 'company' is an empty string
//         const bookingData = { ...req.body };
//         if (!bookingData.company || bookingData.company === "") {
//             bookingData.company = null;
//         }

//         // Create and save booking
//         const newBooking = new Booking(bookingData);
//         await newBooking.save();

//         res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
//     } catch (error) {
//         console.error('Error creating booking:', error);
//         res.status(500).json({ message: 'Error creating booking', error: error.message });
//     }
// };

// Controller to create a booking
exports.createBooking = async (req, res) => {
    try {
        const bookingData = req.body;

        // Handle the case where 'company' is an empty string
        if (!bookingData.company || bookingData.company === "") {
            bookingData.company = null; // Or you can delete the field entirely if required
        }

        // Fetch driver details
        const driver = await Driver.findById(bookingData.driver);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // Find the selected vehicle for the driver
        const selectedVehicle = driver.vehicle.find(
            (item) => item.serviceType.toString() === bookingData.serviceType.toString()
        );

        if (!selectedVehicle) {
            return res.status(404).json({ message: "Vehicle not found for the selected service type" });
        }

        const vehicle = await Vehicle.findOne({ serviceVehicle: selectedVehicle.vehicleNumber })

        if (!vehicle.valid) {
            return res.status(400).json({
                success: false,
                message: "Please select another driver, this vehicle has exceeded its service KM limit.",
            })
        }

        const newBooking = new Booking(bookingData);

        await newBooking.save();

        res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "An internal server error occurred",
            error: error.message,
        });
    }
};
// Controller to create a booking
exports.createBookingNoAuth = async (req, res) => {
    try {
        const bookingData = req.body;

        // Handle the case where 'company' is an empty string
        if (!bookingData.company || bookingData.company === "") {
            bookingData.company = null; // Or you can delete the field entirely if required
        }

        // Fetch driver details
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(bookingData.baselocation)) bookingData.baselocation = null;
        if (!mongoose.Types.ObjectId.isValid(bookingData.showroom)) bookingData.showroom = null;
        if (!mongoose.Types.ObjectId.isValid(bookingData.serviceType)) bookingData.serviceType = null;

        const newBooking = new Booking(bookingData);

        await newBooking.save();

        res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
    } catch (error) {
        console.log(error)
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.errors,
            });
        }

        res.status(500).json({
            success: false,
            message: "An internal server error occurred",
            error: error.message,
        });
    }
};

//Helper function for check and udpate the vehicle serviceKM 
const checkVehicleServiceStatus = async (booking) => {
    try {
        // Step 1: Find the vehicle associated with the booking
        const driver = await Driver.findById(booking.driver);
        if (!driver) {
            throw new Error("Driver not found");
        }

        // Find the selected vehicle for the driver
        const selectedVehicle = driver.vehicle.find(
            (item) => item.serviceType.toString() === booking.serviceType.toString()
        );

        if (!selectedVehicle) {
            throw new Error("Vehicle not found for the selected service type");
        }

        const vehicle = await Vehicle.findOne({ serviceVehicle: selectedVehicle.vehicleNumber });
        if (!vehicle) {
            throw new Error("Vehicle details not found");
        }

        // Step 2: Update the vehicle's odometer with the new booking's distance
        const newOdometerValue = vehicle.totalOdometer + booking.totalDistence;
        const update = {}

        // Step 3: Check if the vehicle has reached its service KM limit then set default value
        if ((newOdometerValue - vehicle.totalOdometer) >= vehicle.serviceKM) {
            update.vehicleServiceDismissed = false
            update.DismissedBy = null
            update.vehicleServiceDue = false
            update.valid = false
        }

        // Step 4: Update the vehicle's odometer
        await Vehicle.findByIdAndUpdate(vehicle._id, {
            totalOdometer: newOdometerValue,
            previousOdometer: vehicle.totalOdometer,
            ...update
        });

        return {
            success: true,
            message: "Vehicle odometer updated successfully.",
            vehicleId: vehicle._id,
            newOdometerValue,
        };
    } catch (error) {
        console.error("Error checking vehicle service status:", error);
        return { success: false, message: "Error processing request", error: error.message };
    }
};

// Controller to get Order completed booking  by search query
exports.getOrderCompletedBookings = async (req, res) => {
    try {
        let { search, startDate, endDate, page = 1, limit = 10 } = req.query;

        // Convert page and limit to integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        const query = {
            status: "Order Completed", // Filter only bookings with this status
            accountantVerified: { $ne: true } // Exclude bookings where accountantVerified is true
        };

        // Handle search
        if (search) {
            search = search.trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            if (dateRegex.test(search)) {
                const [day, month, year] = search.split('/');
                const startOfDay = new Date(`${year}-${month}-${day}T00:00:00Z`);
                const endOfDay = new Date(`${year}-${month}-${day}T23:59:59Z`);

                query.createdAt = {
                    $gte: startOfDay,
                    $lte: endOfDay,
                };
            } else {
                const searchRegex = new RegExp(search.replace(/\s+/g, ''), 'i');
                const matchingDrivers = await Driver.find({ phone: searchRegex }).select('_id');
                const matchingProviders = await Provider.find({ phone: searchRegex }).select('_id');

                query.$or = [
                    { fileNumber: searchRegex },
                    { mob1: searchRegex },
                    { customerVehicleNumber: searchRegex },
                    { bookedBy: searchRegex },
                    { driver: { $in: matchingDrivers.map(d => d._id) } },
                    { provider: { $in: matchingProviders.map(p => p._id) } },
                ];
            }
        }

        // Handle date range filter
        if (startDate || endDate) {
            query.createdAt = query.createdAt || {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        // Pagination and sorting by createdAt in descending order
        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('baselocation')
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });  // Sorting by createdAt in descending order

        res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            bookings,
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

// Controller to get Booking Completed by search query
exports.getAllBookings = async (req, res) => {
    try {
        let {
            search,
            startDate,
            endDate,
            endingDate,
            page = 1,
            limit = 10,
            status = '',
            driverId,
            providerId,
            companyId
        } = req.query;

        // Convert page and limit to integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        const query = {};

        if (status) {
            query.status = { $ne: status }
        }

        // If driverId as query then fetch drivers bookings
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
        }

        // If providerId as query then fetch provider bookings
        if (providerId) {
            query.provider = new mongoose.Types.ObjectId(providerId);
        }

        // If providerId as query then fetch company bookings
        if (companyId) {
            query.company = new mongoose.Types.ObjectId(companyId);
        }

        // Handle search
        if (search) {
            search = search.trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

            if (dateRegex.test(search) || search) {
                const [year, month, day] = search.split('-');
                const startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
                const endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999Z`);

                query.createdAt = { $gte: startOfDay, $lte: endOfDay };

                const searchRegex = new RegExp(search.replace(/\s+/g, ''), 'i');
                const matchingDrivers = await Driver.find({ phone: searchRegex }).select('_id');
                const matchingProviders = await Provider.find({ phone: searchRegex }).select('_id');

                query.$or = [
                    { fileNumber: searchRegex },
                    { mob1: searchRegex },
                    { customerVehicleNumber: searchRegex },
                    { bookedBy: searchRegex },
                    { driver: { $in: matchingDrivers.map(d => d._id) } },
                    { provider: { $in: matchingProviders.map(p => p._id) } },
                ];
            }
        }

        if (startDate && endingDate) {
            const startOfDay = new Date(`${startDate}T00:00:00.000Z`);
            const endOfDay = new Date(`${endingDate}T23:59:59.999Z`);

            query.createdAt = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // Pagination and sorting by createdAt in descending order
        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('baselocation')
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });  // Sorting by createdAt in descending order

        const balanceAmount = bookings.reduce((total, booking) => {
            return total + booking.receivedAmount;
        }, 0);

        // Aggregate data for total amounts
        const aggregationResult = await Booking.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalCollected: { $sum: "$receivedAmount" },
                    totalOverall: { $sum: "$totalAmount" }
                }
            }
        ]);

        // Extract financial data from aggregation result
        const totalCollectedAmount = aggregationResult[0]?.totalCollected || 0;
        const overallAmount = aggregationResult[0]?.totalOverall || 0;
        const balanceAmountToCollect = overallAmount - totalCollectedAmount;

        console.log(query)
        console.log(req.query)
        console.log(bookings)
        console.log(aggregationResult)
        return res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            bookings,
            balanceAmount,
            financials: {
                totalCollectedAmount,
                overallAmount,
                balanceAmountToCollect: balanceAmountToCollect
            }
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

// Controller to get a booking by ID
exports.getBookingById = async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await Booking.findById(id)
            .populate('baselocation') // Populate related documents
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error('Error fetching booking by ID:', error);
        res.status(500).json({ message: 'Server error while fetching the booking' });
    }
};

// Controller to update a booking by ID
exports.updateBooking = async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    try {
        // Fetch the existing booking
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status === "Rejected") {
            booking.status = 'Booking Added'
        }

        // Handle the case where 'company' is an empty string in update
        if (!updatedData.company || updatedData.company === "") {
            updatedData.company = null; // Or you can delete the field entirely if required
        }

        // Check if the body contains 'driver' and handle 'provider' if it exists
        if (updatedData.driver) {
            const booking = await Booking.findById(id); // Fetch the existing booking to check for the provider
            if (booking && booking.provider) {
                // If there's a provider and driver is being set, remove provider and set driver
                await Booking.updateOne({ _id: id }, { $unset: { provider: "" } }); // Remove provider
            }
        }

        // Check if the body contains 'provider' and handle 'driver' if it exists
        if (updatedData.provider) {
            const booking = await Booking.findById(id); // Fetch the existing booking to check for the driver
            if (booking && booking.driver) {
                // If there's a driver and provider is being set, remove driver and set provider
                await Booking.updateOne({ _id: id }, { $unset: { driver: "" } }); // Remove driver
            }
        }

        const updatedBooking = await Booking.findByIdAndUpdate(id, updatedData, { new: true })
            .populate('baselocation') // Populate related documents
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider');

        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({ message: 'Booking updated successfully', booking: updatedBooking });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ message: 'Error updating booking', error: error.message });
    }
};

// Controller to delete a booking by ID

// exports.deleteBooking = async (req, res) => {
//     const { id } = req.params;

//     try {
//         const deletedBooking = await Booking.findByIdAndDelete(id);

//         if (!deletedBooking) {
//             return res.status(404).json({ message: 'Booking not found' });
//         }

//         res.status(200).json({ message: 'Booking deleted successfully' });
//     } catch (error) {
//         console.error('Error deleting booking:', error);
//         res.status(500).json({ message: 'Error deleting booking', error: error.message });
//     }
// };


// Controller for updatatin pickup details from admin side 
exports.updatePickupByAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            totalDistence,
            totalAmount,
            pickupTime,
            dropoffTime,
            serviceVehicleNumber,
            driverSalaryCheck,
            compnayAmountCheck,
            remark,
        } = req.body;

        // Update the booking details
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            {
                totalDistence,
                totalAmount,
                pickupTime,
                dropoffTime,
                driverSalaryCheck,
                compnayAmountCheck,
                remark,
                serviceVehicleNumber,
                status: 'Order Completed',
            },
            { new: true } // Return the updated document
        );

        await checkVehicleServiceStatus(updatedBooking)

        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        res.status(200).json({
            message: 'Booking updated successfully.',
            booking: updatedBooking,
        });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
};

// remove the pickup image 
exports.removePickupImages = async (req, res) => {
    const { id, index } = req.params;

    if (!id) {
        return res.status(400).json({ message: "ID is required" });
    }

    try {
        // Find the booking by ID
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const pickupImages = booking.pickupImages;

        // Check if the index is valid
        if (index < 0 || index >= pickupImages.length) {
            return res.status(400).json({ message: "Invalid index" });
        }

        // Remove the image at the specified index
        const removedImage = pickupImages.splice(index, 1);

        // Save the updated booking
        booking.pickupImages = pickupImages;
        await booking.save();

        res.status(200).json({
            message: "Image removed successfully",
            removedImage,
        });
    } catch (error) {
        console.error("Error removing pickup image:", error);
        res.status(500).json({ error: error.message });
    }
};

// add pickup images
exports.addPickupImages = async (req, res) => {
    console.log("first");

    const { id } = req.params;
    console.log("id", req.params);

    try {
        // Find the booking document by ID
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Get new image paths from the uploaded files
        const newImages = req.files && req.files.length ? req.files.map(file => file.filename) : [];
        console.log(newImages)

        if (!newImages.length) {
            return res.status(400).json({ message: 'No images were uploaded.' });
        }

        // Calculate the total number of images (existing + new)
        const totalImages = booking.pickupImages.length + newImages.length; // For pickup

        // If total images exceed the limit, return an error
        if (totalImages > 6) {
            return res.status(400).json({
                message: `Limit exceeded. You can upload a maximum of 6 images for pickup images. You already have ${booking.pickupImages.length} images.`,
            });
        }

        // Push new images to the pickupImages array
        booking.pickupImages.push(...newImages);

        // Save the updated booking
        await booking.save();

        // Respond with the updated pickup images
        res.status(200).json({
            message: 'Pickup images added successfully',
            pickupImages: booking.pickupImages,
        });
    } catch (error) {
        console.error('Error in addPickupImages:', error);
        res.status(500).json({ message: 'Error updating booking', error: error.message });
    }
};

// remove the dropoff image 
exports.removeDropoffImages = async (req, res) => {
    const { id, index } = req.params;

    if (!id) {
        return res.status(400).json({ message: "ID is required" });
    }

    try {
        // Find the booking by ID
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const dropoffImages = booking.dropoffImages;

        // Check if the index is valid
        if (index < 0 || index >= dropoffImages.length) {
            return res.status(400).json({ message: "Invalid index" });
        }

        // Remove the image at the specified index
        const removedImage = dropoffImages.splice(index, 1);

        // Save the updated booking
        booking.dropoffImages = dropoffImages;
        await booking.save();

        res.status(200).json({
            message: "Image removed successfully",
            removedImage,
        });
    } catch (error) {
        console.error("Error removing dropoff image:", error);
        res.status(500).json({ error: error.message });
    }
};

// add dropoff images
exports.addDropoffImages = async (req, res) => {


    const { id } = req.params;

    try {
        // Find the booking document by ID
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Get new image paths from the uploaded files
        const newImages = req.files && req.files.length ? req.files.map(file => file.filename) : [];
        console.log(newImages)

        if (!newImages.length) {
            return res.status(400).json({ message: 'No images were uploaded.' });
        }

        // Calculate the total number of images (existing + new)
        const totalImages = booking.dropoffImages.length + newImages.length; // For dropoff

        // If total images exceed the limit, return an error
        if (totalImages > 6) {
            return res.status(400).json({
                message: `Limit exceeded. You can upload a maximum of 6 images for dropoff images. You already have ${booking.dropoffImages.length} images.`,
            });
        }

        // Push new images to the pickupImages array
        booking.dropoffImages.push(...newImages);

        // Save the updated booking
        await booking.save();

        // Respond with the updated dropoff images
        res.status(200).json({
            message: 'Dropoff images added successfully',
            dropoffImages: booking.dropoffImages,
        });
    } catch (error) {
        console.error('Error in addDropoffImages:', error);
        res.status(500).json({ message: 'Error updating booking', error: error.message });
    }
};

//Editing filenumber 
exports.updateFilenumber = async (req, res) => {
    const { fileNumber } = req.body; // Destructure fileNumber from the request body
    const { id } = req.params; // Extract id from the request parameters

    try {
        // Find the booking by ID and update the fileNumber
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        booking.fileNumber = fileNumber; // Update the fileNumber
        await booking.save(); // Save the updated booking

        res.status(200).json({ message: "Filenumber updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating booking", error: error.message });
    }
};

//   Booking verify 
exports.verifyBooking = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(id, 'this is id');

        // Fetch the booking details
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        // Adjust cash in hand and salary similar to updatePickupByAdmin
        if (booking.workType === "RSAWork") {
            const selectedCompany = booking.company;
            if (!selectedCompany) {
                console.error('The company is not selected');
            } else {
                const company = await Company.findById(selectedCompany);
                if (company) {
                    company.cashInHand = company.cashInHand || 0;
                    company.cashInHand += booking.totalAmount;
                    await company.save();
                } else {
                    console.error('Company not found');
                }
            }
        } else if (booking.workType === 'PaymentWork') {
            if (booking.provider) {
                const selectedProvider = await Provider.findById(booking.provider);
                if (!selectedProvider) {
                    console.error('The selected provider is not available');
                } else {
                    console.log('Total Amount:', booking.totalAmount, 'Driver Salary:', booking.driverSalary);

                    selectedProvider.cashInHand = selectedProvider.cashInHand || 0;
                    selectedProvider.driverSalary = selectedProvider.driverSalary || 0;

                    if (!isNaN(booking.totalAmount) && !isNaN(booking.driverSalary)) {
                        selectedProvider.cashInHand += booking.totalAmount;
                        selectedProvider.driverSalary += booking.driverSalary;
                        await selectedProvider.save();
                    } else {
                        console.error('Invalid cashInHand or driverSalary before saving:', selectedProvider.cashInHand, selectedProvider.driverSalary);
                    }
                }
            } else if (booking.driver) {
                const selectedDriver = await Driver.findById(booking.driver);
                if (!selectedDriver) {
                    console.error('The selected driver is not available');
                } else {
                    console.log('Total Amount:', booking.totalAmount, 'Driver Salary:', booking.driverSalary);

                    selectedDriver.cashInHand = selectedDriver.cashInHand || 0;
                    selectedDriver.driverSalary = selectedDriver.driverSalary || 0;

                    if (!isNaN(booking.totalAmount) && !isNaN(booking.driverSalary)) {
                        selectedDriver.cashInHand += booking.totalAmount;
                        // selectedDriver.driverSalary += booking.driverSalary; // Uncomment if needed
                        await selectedDriver.save();
                    } else {
                        console.error('Invalid cashInHand or driverSalary before saving:', selectedDriver.cashInHand, selectedDriver.driverSalary);
                    }
                }
            }
        }

        // Update booking status to verified
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            { verified: true },
            { new: true }
        );

        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        res.status(200).json({
            message: 'Booking verified successfully.',
            booking: updatedBooking,
        });

    } catch (error) {
        console.error('Error verifying booking:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
};

// posting feedback 
exports.postFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;

        // Validate booking ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid booking ID" });
        }

        // Validate feedback input
        if (!Array.isArray(feedback) || feedback.length === 0) {
            return res.status(400).json({ message: "Feedback array is required" });
        }

        // Calculate total points from feedback
        let totalPoints = feedback.reduce((sum, item) => {
            const yesPoint = Number(item.yesPoint) || 0;
            const noPoint = Number(item.noPoint) || 0;
            return sum + (item.response === "yes" ? yesPoint : noPoint);
        }, 0);

        // Find the booking
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Update feedback and totalPoints in Booking
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            {
                $set: {
                    feedback: feedback,
                    totalPoints: totalPoints,
                    feedbackCheck: true
                }
            },
            { new: true }
        );

        // If the booking contains a valid driver, update the driver's rewardPoints
        if (booking.driver && mongoose.Types.ObjectId.isValid(booking.driver)) {
            const driverExists = await Driver.findById(booking.driver);
            if (driverExists) {
                await Driver.findByIdAndUpdate(
                    booking.driver,
                    { $inc: { rewardPoints: totalPoints } },
                    { new: true }
                );
            }
        }

        // **Additional Condition: Update Driver Salary if workType is "paymentWork"**
        if (booking.driver) {
            const selectedDriver = await Driver.findById(booking.driver);

            if (selectedDriver) {
                console.log('Total Amount:', booking.totalAmount, 'Driver Salary:', booking.driverSalary);

                selectedDriver.driverSalary = Number(selectedDriver.driverSalary) || 0;
                const bookingDriverSalary = Number(booking.driverSalary);

                if (!isNaN(booking.totalAmount) && !isNaN(bookingDriverSalary)) {
                    selectedDriver.driverSalary += bookingDriverSalary;
                    await selectedDriver.save();
                } else {
                    return res.status(400).json({ message: "Invalid totalAmount or driverSalary" });
                }
            }
        }

        res.status(200).json({
            message: "Feedback and driver salary updated successfully",
            booking: updatedBooking
        });

    } catch (error) {
        console.error("Error in postFeedback:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// accountant verifying 
exports.accountVerifying = async (req, res) => {
    const { id } = req.params

    try {
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            {
                accountantVerified: true
            },
            { new: true }
        );
        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        res.status(200).json({
            message: 'Accountant verified successfully.',
            booking: updatedBooking,
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
}

//Fetch approved bookings
exports.getApprovedBookings = async (req, res) => {
    try {
        let { search, startDate, endDate, page = 1, limit = 10 } = req.query;

        // Convert page and limit to integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        // Base query for approved bookings
        const query = {
            status: "Order Completed", // Filter only bookings with this status
            accountantVerified: true,  // Ensure accountantVerified is true
        };

        // Handle search
        if (search) {
            search = search.trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
            if (dateRegex.test(search)) {
                const [day, month, year] = search.split('/');
                const startOfDay = new Date(`${year}-${month}-${day}T00:00:00Z`);
                const endOfDay = new Date(`${year}-${month}-${day}T23:59:59Z`);

                query.createdAt = {
                    $gte: startOfDay,
                    $lte: endOfDay,
                };
            } else {
                const searchRegex = new RegExp(search.replace(/\s+/g, ''), 'i');
                const matchingDrivers = await Driver.find({ phone: searchRegex }).select('_id');
                const matchingProviders = await Provider.find({ phone: searchRegex }).select('_id');

                query.$or = [
                    { customerName: searchRegex }, // Replaced fileNumber with customerName
                    { mob1: searchRegex },
                    { customerVehicleNumber: searchRegex },
                    { bookedBy: searchRegex },
                    { driver: { $in: matchingDrivers.map(d => d._id) } },
                    { provider: { $in: matchingProviders.map(p => p._id) } },
                ];
            }
        }

        // Handle date range filter
        if (startDate || endDate) {
            query.createdAt = query.createdAt || {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        // Pagination and sorting by createdAt in descending order
        const total = await Booking.countDocuments(query);
        const bookings = await Booking.find(query)
            .populate('baselocation')
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });  // Sorting by createdAt in descending order

        res.status(200).json({
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            bookings,
        });
    } catch (error) {
        console.error('Error fetching approved bookings:', error);
        res.status(500).json({ message: 'Server error while fetching approved bookings' });
    }
};

// Controller to get Booking (based on status)
exports.getAllBookingsBasedOnStatus = async (req, res) => {
    try {
        let { status = '', search, page = 1, limit = 10 } = req.query;

        // Convert page and limit to integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        let query = {};

        if (search) {
            search = search.trim();

            const searchRegex = new RegExp(search.replace(/\s+/g, ''), 'i');
            const matchingDrivers = await Driver.find({ name: searchRegex }).select('_id');

            query.$or = [
                { fileNumber: searchRegex },
                { mob1: searchRegex },
                { customerVehicleNumber: searchRegex },
                { customerName: searchRegex },
                { bookedBy: searchRegex },
                { driver: { $in: matchingDrivers.map(d => d._id) } },
            ];
        } else {

            if (status === "Order Completed") {
                query.status = "Order Completed";
                query.cashPending = false;
            } else if (status === "OngoingBookings") {
                query.status = {
                    $in: [
                        "Booking Added",
                        "called to customer",
                        "Order Received",
                        "On the way to pickup location",
                        "Vehicle Picked",
                        "Vehicle Confirmed",
                        "To DropOff Location",
                        "On the way to dropoff location",
                        "Vehicle Dropped",
                        "Booking Added"
                    ]
                };
                query.cashPending = false;
            } else if (status === "CashPendingBookings") {
                query.cashPending = true;
            }
        }


        const total = await Booking.countDocuments(query);

        const bookings = await Booking.find(query)
            .populate('baselocation')
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            // .populate('provider')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            bookings,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching bookings:', error.message);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

//Controller to settle booking amount 
exports.settleAmount = async (req, res) => {
    try {
        const { id } = req.params;
        const { receivedAmount } = req.body;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        booking.receivedAmount += receivedAmount;
        if (booking.totalAmount <= booking.receivedAmount) {
            booking.cashPending = false;
        }

        await booking.save();

        return res.status(200).json({
            message: "Settle amount updated",
            booking
        });

    } catch (error) {
        console.error('Error settling booking amount:', error.message);
        res.status(500).json({ message: 'Server error while settling booking amount.' });
    }
};

//Controller for update booking as approved 
exports.updateBookingApproved = async (req, res) => {
    try {
        const { id } = req.params

        const booking = await Booking.findById(id)

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        booking.accountantVerified = true
        await booking.save()

        return res.status(200).json({
            message: "Booking updated successfully, approved"
        })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            message: error.message
        })
    }
}