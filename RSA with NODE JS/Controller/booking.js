const Booking = require('../Model/booking');
const Driver = require('../Model/driver');
const Provider = require('../Model/provider');
const Company = require('../Model/company');
const Showroom = require('../Model/showroom');
const ShowroomStaff = require('../Model/showroomStaff');
const mongoose = require('mongoose');
const Vehicle = require('../Model/vehicle');
const { io } = require('../config/socket');
const { capitalizeFirstLetter, convertTo12HourFormat } = require('../utils/dateUtils');
const Staff = require('../Model/staff');
const agenda = require('../config/Agenda.config')()
const LoggerFactory = require('../utils/logger/LoggerFactory');
const NotificationService = require('../services/notification.service');
const SalaryTransaction = require('../Model/salaryTransaction')
const asyncErrorHandler = require('../Middileware/asyncErrorHandler');
const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../Middileware/errorHandler');


// Controller to create a booking
exports.createBooking = async (req, res) => {
    let bookingData = req.body;

    try {

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/booking',
            handler: 'createBooking',
        });

        routeLogger.info({
            fileNumber: bookingData.fileNumber,
            doneBy: req.user || 'unknown'
        }, 'New Booking creation process started...');

        const isFileNumberExisint = await Booking.findOne({ fileNumber: bookingData.fileNumber })

        if (isFileNumberExisint) {

            routeLogger.error({
                fileNumber: bookingData.fileNumber,
                doneBy: req.user || 'unknown'
            }, 'New Booking creation process failed, Enter a unique file Number');

            return res.status(400).json({ message: "Enter a unique file Number", success: false });
        }

        // Handle the case where 'company' is an empty string
        if (!bookingData.company || bookingData.company === "") {
            bookingData.company = null; // Or you can delete the field entirely if required
        }

        let source = null;

        if (bookingData.dummyEntity.id === 'dummy') {
            if (bookingData.dummyEntity.name === 'Dummy Driver') {
                bookingData.dummyDriverName = bookingData.dummyEntity.name
            } else {
                bookingData.dummyProviderName = bookingData.dummyEntity.name
            }
        } else {

            const getVehicleForService = (vehicles, serviceType) => {
                return vehicles.find(
                    (item) => item.serviceType.toString() === serviceType.toString()
                );
            };

            if (bookingData.driver) {
                source = await Driver.findById(bookingData.driver);
                routeLogger.error({
                    fileNumber: bookingData.fileNumber,
                    doneBy: req.user || 'unknown'
                }, 'New Booking creation process failed, Driver not found');
                if (!source) return res.status(404).json({ message: "Driver not found" });

            } else {
                source = await Provider.findById(bookingData.provider);
                routeLogger.error({
                    fileNumber: bookingData.fileNumber,
                    doneBy: req.user || 'unknown'
                }, 'New Booking creation process failed, Provider not found');
                if (!source) return res.status(404).json({ message: "Provider not found" });
            }

            const selectedVehicle = getVehicleForService(bookingData.driver ? source.vehicle : source.serviceDetails, bookingData.serviceType);
            if (!selectedVehicle) {
                routeLogger.error({
                    fileNumber: bookingData.fileNumber,
                    doneBy: req.user || 'unknown'
                }, 'New Booking creation process failed, Vehicle not found for the selected service type.');
                return res.status(404).json({ message: "Vehicle not found for the selected service type" });
            }

            bookingData.vehicleNumber = selectedVehicle.vehicleNumber || "";
            bookingData.createdBy = req.user._id || req.user.id;
            bookingData.bookedByModel = "Admin";

        }

        if (
            bookingData.totalAmount &&
            bookingData.rewardAmount
        ) {
            bookingData.totalAmount -= bookingData.rewardAmount;
        }

      // CRITICAL FIX: Set createdAt based on pickupDate if it exists
        if (bookingData.pickupDate) {
            bookingData.createdAt = new Date(bookingData.pickupDate);
            bookingData.status = 'Scheduled'; // Different status for future bookings
        } else {
            bookingData.status = 'Booking Added'; // Immediate booking status
        }

        const newBooking = new Booking(bookingData);
        await newBooking.save();

        routeLogger.info({
            fileNumber: bookingData.fileNumber,
            doneBy: req.user || 'unknown'
        }, 'New Booking created successfully.');

        const agendaInstance = await agenda;
        if (bookingData.pickupDate) {
            const pickupTime = new Date(bookingData.pickupDate);
            const now = new Date();

            if (pickupTime > now) {
                console.log('Scheduling future job for pickupDate:', pickupTime);
                await agendaInstance.schedule(pickupTime, 'activate booking', {
                    bookingId: newBooking._id
                });
            } else {
                console.log('Running job immediately - pickupDate is in the past');
                await agendaInstance.now('activate booking', {
                    bookingId: newBooking._id
                });
            }
        } else {
            console.log('Running job immediately - no pickupDate');
            await agendaInstance.now('activate booking', {
                bookingId: newBooking._id
            });
        }


        res.status(201).json({ message: 'Booking created successfully', booking: newBooking });

        // Populate and emit separately to improve response time
        process.nextTick(async () => {
            try {
                const populatedBooking = await Booking.findById(newBooking._id)
                    .populate('baselocation company driver provider')
                    .lean();

                if (populatedBooking) {
                    io.emit("newChanges", {
                        type: 'newBooking',
                        bookingId: newBooking._id,
                        newBooking: populatedBooking,
                    });
                }
            } catch (err) {
                console.error("Failed to populate and emit:", err.message);
            }
        });
    } catch (error) {

        routeLogger.FATAL({
            fileNumber: bookingData.fileNumber,
            doneBy: req.user || 'unknown'
        }, 'New Booking created failed.');

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

// Controller to create a booking for showroom and showroom staff dashboard
exports.addBookingForShowroom = async (req, res) => {
    let bookingData = req.body;
    try {

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/booking/showroom/add-booking',
            handler: 'addBookingForShowroom',
        });

        const showroomData = await Showroom.findById(bookingData.showroom).lean();

        if (!showroomData) {
            routeLogger.FATAL({
                fileNumber: bookingData.fileNumber,
                doneBy: req.user || 'unknown'
            }, 'New Booking created failed.Showroom not found. Please try another showroom');
            return res.status(404).json({
                message: 'Showroom not found. Please try another showroom.',
                success: false,
            })
        }

        const enrichedBookingData = {
            ...bookingData,
            dropoffLocation: showroomData.location,
            dropoffLatitudeAndLongitude: showroomData.latitudeAndLongitude,
            bookedBy: "Showroom",
            createdBy: req.user._id || req.user.id,
            bookedByModel: capitalizeFirstLetter(bookingData.bookingStatus) || 'Showroom'
        };

        const newBooking = await Booking.create(enrichedBookingData);

        routeLogger.info({
            fileNumber: bookingData.fileNumber,
            doneBy: req.user || 'unknown'
        }, 'New Showroom Booking created successfull.');

        res.status(201).json({
            message: 'Booking created successfully',
            booking: newBooking
        });

        // Populate and emit separately to improve response time
        process.nextTick(async () => {
            try {
                const populatedBooking = await Booking.findById(newBooking._id)
                    .populate('baselocation company driver provider')
                    .lean();

                if (populatedBooking) {
                    io.emit("newChanges", {
                        type: 'newBooking',
                        bookingId: newBooking._id,
                        newBooking: populatedBooking,
                    });
                }
            } catch (err) {
                console.error("Failed to populate and emit:", err.message);
            }
        });
    } catch (error) {

        routeLogger.FATAL({
            fileNumber: bookingData.fileNumber,
            doneBy: req.user || 'unknown'
        }, 'New Booking created failed.');

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
}

// Controller to create a booking
exports.createBookingNoAuth = async (req, res) => {
    try {
        const bookingData = req.body;
        const routeLogger = LoggerFactory.createChildLogger({
            route: '/new-booking',
            handler: 'createBookingNoAuth',
        });

        routeLogger.info({
            doneBy: req?.user || 'unknown'
        }, 'New Booking(Whatsapp API) creation process started...');

        // Handle company field
        if (!bookingData.company || bookingData.company === "") {
            bookingData.company = null;
        }

        // Handle fileNumber field - ensure it's never null
        if (!bookingData.fileNumber || bookingData.fileNumber === "") {
            // Generate a unique fileNumber or use a default value
            bookingData.fileNumber = `WB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(bookingData.baselocation)) bookingData.baselocation = null;
        if (!mongoose.Types.ObjectId.isValid(bookingData.showroom)) bookingData.showroom = null;
        if (!mongoose.Types.ObjectId.isValid(bookingData.serviceType)) bookingData.serviceType = null;
        
        bookingData.isWhatsappBooking = true;
        const newBooking = new Booking(bookingData);

        await newBooking.save();

        routeLogger.info({
            fileNumber: newBooking.fileNumber,
            doneBy: req.user || 'unknown'
        }, 'New Booking(Whatsapp API) created successfully.');

        res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
    } catch (error) {
        console.log(error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: error.errors,
            });
        }

        // Handle duplicate key error specifically
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Duplicate booking detected",
                error: "A booking with this file number already exists",
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

          // Step 2: Calculate new odometer value by summing all completed bookings' distances
        const completedBookings = await Booking.aggregate([
            {
                $match: {
                    driver: booking.driver,
                    status: "Order Completed",
                    serviceType: booking.serviceType,
                    $or: [
                        { serviceDue: { $exists: false } },
                        { serviceDue: { $ne: false } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalDistance: { $sum: "$totalDriverDistence" }
                }
            }
        ]);

        const totalCompletedDistance = completedBookings.length > 0 
            ? completedBookings[0].totalDistance 
            : 0;

        // Use either the sum of completed bookings or the current odometer + current booking distance
        const newOdometerValue = vehicle.totalOdometer  + totalCompletedDistance;
        
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
// ------------------------
// Controller to get Order completed booking  by search query
exports.getOrderCompletedBookings = async (req, res) => {
    try {
        let { search, startDate, endDate, page = 1, limit = 10, all = false, tab } = req.query;

        // Convert page and limit based on 'all' flag
        page = all ? 1 : parseInt(page, 10);
        limit = all ? Number.MAX_SAFE_INTEGER : parseInt(limit, 10);

        const query = {
            status: "Order Completed", // Filter only bookings with this status
            accountantVerified: { $ne: true } // Exclude bookings where accountantVerified is true
        };
        // Add tab-specific filters
        if (tab === 'feedback') {
            query.verified = true;
            query.feedbackCheck = true;
        } else if (tab === 'verify') {
            query.$or = [
                {
                    verified: true,
                    feedbackCheck: { $ne: true, $exists: true }
                },
                {
                    verified: false
                },
                {
                    verified: { $exists: false }
                }
            ];
        }
        // Handle search
        if (search) {

            query._includeHidden = true;

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
                const matchingDrivers = await Driver.find({ name: searchRegex }).select('_id');
                const matchingProviders = await Provider.find({ name: searchRegex }).select('_id');
                const matchingCompanies = await Company.find({ name: searchRegex }).select('_id'); // Add this line
                query.$or = [
                    { fileNumber: searchRegex },
                    { mob1: searchRegex },
                    { customerVehicleNumber: searchRegex },
                    { bookedByModel: searchRegex },
                    { driver: { $in: matchingDrivers.map(d => d._id) } },
                    { provider: { $in: matchingProviders.map(p => p._id) } },
                    { company: { $in: matchingCompanies.map(c => c._id) } }, // Add this line

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
            .populate('verifiedBy', 'name email') // Add this line to populate staff details

            .skip((page - 1) * limit) // Now this will work correctly with search
            .limit(limit)
            .sort({ createdAt: -1 });  // Sorting by createdAt in descending order

        res.status(200).json({
            total,
            page: all ? 1 : page,
            limit: all ? total : limit,
            totalPages: all ? 1 : Math.ceil(total / limit),
            bookings,
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

// Controller to get Booking Completed by search query
// Controller to get Booking Completed by search query
exports.getAllBookings = async (req, res) => {
    const routeLogger = LoggerFactory.createChildLogger({
        route: '/booking',
        handler: 'getAllBookings',
    });
    try {
        let {
            search,
            startDate,
            endDate,
            endingDate,
            forDriverReport,
            forCompanyReport,
            forStaffReport,
            forShowroomReport,
            page = 1,
            limit = 10,
            status = '',
            driverId,
            showroomId,
            providerId,
            companyId,
            verified,
            staffId,
            all = false,
            hasPickupDate // Add this parameter to filter by pickupDate
        } = req.query;

        // Convert page and limit to integers
        page = all ? 1 : parseInt(page, 10);
        limit = all ? Number.MAX_SAFE_INTEGER : parseInt(limit, 10);

        const query = {};

        // CRITICAL: Check and update bookings where pickupDate has been reached
        await updateScheduledBookings();

        // Handle pickupDate filter
        if (hasPickupDate === 'true') {
            query.pickupDate = { $exists: true, $ne: null };
            // Optionally filter by status for scheduled bookings
            if (!status) {
                query.status = 'Scheduled';
            }
        } else if (hasPickupDate === 'false') {
            query.pickupDate = { $exists: false };
        }

        if (status) {
            if (Array.isArray(status)) {
                query.status = { $nin: status }
            } else {
                query.status = { $ne: status }
            }
        }

        // If driverId as query then fetch drivers bookings
        if (driverId) {
            query.driver = new mongoose.Types.ObjectId(driverId);
        }

        // If driverId as query then fetch drivers bookings
        if (verified) {
            query.verified = verified
        }

        // If providerId as query then fetch provider bookings
        if (providerId) {
            query.provider = new mongoose.Types.ObjectId(providerId);
        }

        // Add this to your backend controller
        if (showroomId) {
            query.showroom = new mongoose.Types.ObjectId(showroomId);
        }

        // If providerId as query then fetch company bookings
        if (companyId) {
            query.company = new mongoose.Types.ObjectId(companyId);
            query.workType = 'RSAWork'
        }

        //----------------------------------------
        if (staffId) {
            query.$and = [
                {
                    $or: [
                        {
                            $and: [
                                { receivedUserId: new mongoose.Types.ObjectId(staffId) },
                                { receivedUser: 'Staff' }
                            ]
                        },
                        {
                            $and: [
                                { previousReceivedUserId: new mongoose.Types.ObjectId(staffId) },
                                { previousReceivedUser: 'Staff' }
                            ]
                        }
                    ]
                }
            ];
        }

        // Handle search
        if (search) {
            // Overridinf the custom plugin
            query._includeHidden = true;

            const searchQuery = search.trim();
            const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

            // Handle date search separately
            if (dateRegex.test(searchQuery)) {
                const [day, month, year] = searchQuery.split('/');
                const startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
                const endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
                query.createdAt = { $gte: startOfDay, $lte: endOfDay };
            } else {
                const regex = new RegExp(searchQuery, 'i');

                // Search conditions array
                const searchConditions = [
                    { fileNumber: regex },
                    { mob1: regex },
                    { customerVehicleNumber: regex },
                ];

                const [matchingDrivers, matchingProviders, matchingCompanies, matchingShowrooms] = await Promise.all([
                    Driver.find({ name: regex }).select('_id').lean(),
                    Provider.find({ name: regex }).select('_id').lean(),
                    Company.find({ name: regex }).select('_id').lean(),
                    Showroom.find({ name: regex }).select('_id').lean()
                ]);

                if (matchingDrivers.length > 0) {
                    searchConditions.push({ driver: { $in: matchingDrivers.map(d => d._id) } });
                }
                if (matchingProviders.length > 0) {
                    searchConditions.push({ provider: { $in: matchingProviders.map(p => p._id) } });
                }
                if (matchingCompanies.length > 0) {
                    searchConditions.push({ company: { $in: matchingCompanies.map(c => c._id) } });
                }
                if (matchingShowrooms.length > 0) {
                    searchConditions.push({ showroom: { $in: matchingShowrooms.map(c => c._id) } });
                }

                query.$or = searchConditions;
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
        let bookings = await Booking.find(query)
            .populate('baselocation')
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider')
            .populate('receivedUserId')
            .populate('previousReceivedUserId')
            .skip(all ? 0 : (page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

        //---------------------------
        const balanceAmount = bookings.reduce((total, booking) => {
            if (forStaffReport) {
                const isStaffInvolved = booking.receivedUser === 'Staff' || booking.previousReceivedUser === 'Staff';
                return isStaffInvolved ? total + (booking.givenAmountByStaff || 0) : total;
            }

            if (forDriverReport &&
                (booking.receivedUser === 'Staff' || booking.previousReceivedUser === 'Staff') &&
                booking.partialReceivedAmountStaff === true) {
                return total + (booking.receivedAmountStaff || 0);
            }
            if (forShowroomReport) {
                // Calculate showroom-specific balance
                return total + (booking.receivedAmountShowroom || 0);
            }
            return total + (booking.receivedAmount || 0);
        }, 0);

        query.workType = { $ne: 'RSAWork' };

        // Add this temporary aggregation to see what documents are being processed
        const debugAggregation = await Booking.aggregate([
            {
                $match: {
                    ...query,
                    ...(forDriverReport && { cashPending: false }),
                    $or: [
                        { receivedUser: "Driver" },
                        {
                            $and: [
                                { receivedUser: "Staff" },
                                { multipleReceivedUser: true },
                                { previousReceivedUser: "Driver" }
                            ]
                        }
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    fileNumber: 1,
                    receivedUser: 1,
                    previousReceivedUser: 1,
                    multipleReceivedUser: 1,
                    totalAmount: 1,
                    receivedAmountDriver: 1,
                    receivedAmount: 1,
                    amountType: {
                        $cond: [
                            { $eq: ["$receivedUser", "Driver"] },
                            "DIRECT_DRIVER_RECEIPT",
                            {
                                $cond: [
                                    {
                                        $and: [
                                            { $eq: ["$receivedUser", "Staff"] },
                                            { $eq: ["$multipleReceivedUser", true] },
                                            { $eq: ["$previousReceivedUser", "Driver"] }
                                        ]
                                    },
                                    "STAFF_RECEIVED_AFTER_DRIVER",
                                    "OTHER"
                                ]
                            }
                        ]
                    }
                }
            }
        ]);

        console.log('Documents being processed in aggregation:');
        console.log(JSON.stringify(debugAggregation, null, 2));

        // Now run your original aggregation with the corrected totalOverall
        const aggregationResult = await Booking.aggregate([
            {
                $match: {
                    ...query,
                    ...((forDriverReport !== undefined || forStaffReport !== undefined || forCompanyReport !== undefined || forShowroomReport !== undefined) && { cashPending: false }),
                    ...((forCompanyReport !== undefined) && { workType: 'RSAWork' }),
                    ...(forDriverReport && {
                        $or: [
                            { receivedUser: { $ne: 'Staff' } },
                            { receivedUser: 'Staff', partialReceivedAmountStaff: true },
                            { receivedUser: "Driver" },
                            { receivedUser: { $exists: false } },
                            {
                                $and: [
                                    { receivedUser: "Staff" },
                                    { multipleReceivedUser: true },
                                    { previousReceivedUser: "Driver" }
                                ]
                            }
                        ]
                    }),
                    ...(forStaffReport && {
                        $or: [
                            { receivedUser: 'Staff' },
                            { previousReceivedUser: 'Staff' }
                        ]
                    }),
                    ...(forShowroomReport && {
                        showroom: showroomId ? new mongoose.Types.ObjectId(showroomId) : { $exists: true }
                    })
                }
            },
            {
                $group: {
                    _id: null,
                    totalCollected: {
                        $sum: forStaffReport
                            ? "$givenAmountByStaff"
                            : forDriverReport
                                ? {
                                    $cond: [
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        { $eq: ["$receivedUser", "Staff"] },
                                                        { $eq: ["$partialReceivedAmountStaff", true] }
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        { $eq: ["$previousReceivedUser", "Staff"] },
                                                        { $eq: ["$partialReceivedAmountStaff", true] }
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        { $eq: ["$receivedUser", "Staff"] },
                                                        { $eq: ["$multipleReceivedUser", true] },
                                                        { $eq: ["$previousReceivedUser", "Driver"] }
                                                    ]
                                                }
                                            ]
                                        },
                                        {
                                            $cond: [
                                                {
                                                    $and: [
                                                        { $eq: ["$receivedUser", "Staff"] },
                                                        { $eq: ["$multipleReceivedUser", true] },
                                                        { $eq: ["$previousReceivedUser", "Driver"] },
                                                        { $eq: ["$receivedAmountDriver", "$receivedAmount"] },
                                                        { $ne: ["$receivedAmountStaff", "$givenAmountByStaff"] }
                                                    ]
                                                },
                                                '$totalAmount',
                                                {
                                                    $cond: [
                                                        {
                                                            $and: [
                                                                { $eq: ["$receivedAmount", "$totalAmount"] },
                                                                { $eq: ["$receivedUser", "Staff"] },
                                                                { $eq: ["$multipleReceivedUser", true] },
                                                                { $eq: ["$previousReceivedUser", "Driver"] }
                                                            ]
                                                        },
                                                        "$receivedAmount",
                                                        {
                                                            $cond: [
                                                                {
                                                                    $and: [
                                                                        { $eq: ["$receivedUser", "Staff"] },
                                                                        { $eq: ["$multipleReceivedUser", true] },
                                                                        { $eq: ["$previousReceivedUser", "Driver"] }
                                                                    ]
                                                                },
                                                                "$receivedAmountDriver",
                                                                "$receivedAmountStaff"
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        },
                                        "$receivedAmount"
                                    ]
                                }
                                : forCompanyReport
                                    ? "$receivedAmountByCompany"
                                    : forShowroomReport
                                        ? "$receivedAmountShowroom"
                                        : "$receivedAmount"
                    },
                    totalOverall: {
                        $sum: forStaffReport
                            ? "$receivedAmountStaff"
                            : forDriverReport
                                ? {
                                    $cond: [
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        { $eq: ["$receivedUser", "Staff"] },
                                                        { $eq: ["$partialReceivedAmountStaff", true] }
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        { $eq: ["$receivedUser", "Staff"] },
                                                        { $eq: ["$partialReceivedAmountStaff", true] }
                                                    ]
                                                }
                                            ]
                                        },
                                        "$totalAmount",
                                        {
                                            $cond: [
                                                {
                                                    $or: [
                                                        { $ne: ["$receivedUser", "Staff"] },
                                                        { $ne: ["$previousReceivedUser", "Staff"] }
                                                    ]
                                                },
                                                "$totalAmount",
                                                0
                                            ]
                                        }
                                    ]
                                }
                                : forCompanyReport
                                    ? "$totalAmount"
                                    : forShowroomReport
                                        ? "$showroomAmount"
                                        : "$totalAmount"
                    },
                    advanceData: {
                        $push: {
                            $cond: [
                                {
                                    $or: [
                                        {
                                            $and: [
                                                { $eq: ["$receivedUser", "Staff"] },
                                                { $eq: ["$fileNumber", "Advance Deduction"] },
                                                staffId ? { $eq: ["$receivedUserId", new mongoose.Types.ObjectId(staffId)] } : true
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $eq: ["$previousReceivedUser", "Staff"] },
                                                { $eq: ["$fileNumber", "Advance Deduction"] },
                                                staffId ? { $eq: ["$previousReceivedUserId", new mongoose.Types.ObjectId(staffId)] } : true
                                            ]
                                        }
                                    ]
                                },
                                {
                                    receivedAmount: { $toDouble: "$receivedAmount" },
                                    givenAmountByStaff: { $toDouble: "$givenAmountByStaff" }
                                },
                                null
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    totalCollected: 1,
                    totalOverall: 1,
                    advanceToCollectFromStaff: {
                        $let: {
                            vars: {
                                advanceItems: {
                                    $filter: {
                                        input: "$advanceData",
                                        as: "item",
                                        cond: { $ne: ["$$item", null] }
                                    }
                                }
                            },
                            in: {
                                $subtract: [
                                    { $sum: "$$advanceItems.receivedAmount" },
                                    { $sum: "$$advanceItems.givenAmountByStaff" }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        console.log('============ AGGREGATION RESULTS ============');
        console.log('Full aggregation result:', JSON.stringify(aggregationResult, null, 2));

        const aggregationResult2 = await Booking.aggregate([
            {
                $match: {
                    ...query,
                    ...((forDriverReport !== undefined || forStaffReport !== undefined || forCompanyReport !== undefined || forShowroomReport !== undefined) && { partialPayment: true }),
                    ...((forCompanyReport !== undefined) && { workType: 'RSAWork' }),
                    ...(forDriverReport && { receivedUser: { $ne: 'Staff' } })
                }
            },
            {
                $group: {
                    _id: null,
                    totalPartialAmount: { $sum: "$partialAmount" }
                }
            }
        ]);

        // Extract financial data from aggregation result
        const totalCollectedAmount = aggregationResult[0]?.totalCollected || 0;
        const overallAmount = aggregationResult[0]?.totalOverall || 0;
        const advanceToCollectFromStaff = aggregationResult[0]?.advanceToCollectFromStaff || 0;
        let balanceAmountToCollect = overallAmount - totalCollectedAmount;
        balanceAmountToCollect += aggregationResult2[0]?.totalPartialAmount || 0

        console.log('Final calculations:', {
            totalCollectedAmount,
            overallAmount,
            advanceToCollectFromStaff,
            balanceAmountToCollect
        });

        routeLogger.info({
            doneBy: req.user || 'unknown',
            reportType: forStaffReport ? 'staff' : forDriverReport ? 'driver' : forCompanyReport ? 'company' : 'general'
        }, 'Booking fetch success.');

        return res.status(200).json({
            total,
            page: all ? 1 : page,
            limit: all ? total : limit,
            totalPages: all ? 1 : Math.ceil(total / limit),
            bookings,
            balanceAmount,
            financials: {
                totalCollectedAmount,
                overallAmount,
                balanceAmountToCollect: balanceAmountToCollect,
                advanceToCollectFromStaff
            }
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

// Helper function to update scheduled bookings when pickupDate is reached
async function updateScheduledBookings() {
    try {
        const now = new Date();
        const result = await Booking.updateMany(
            {
                status: 'Scheduled',
                pickupDate: { $lte: now }
            },
            {
                $set: {
                    status: 'Booking Added',
                    activatedAt: now
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`Updated ${result.modifiedCount} bookings from Scheduled to Booking Added`);
            
            // Emit socket event for real-time updates
            const updatedBookings = await Booking.find({
                status: 'Booking Added',
                activatedAt: { $gte: new Date(now.getTime() - 1000) } // Bookings updated in the last second
            }).populate('baselocation company driver provider').lean();

            updatedBookings.forEach(booking => {
                io.emit("bookingActivated", {
                    type: 'bookingActivated',
                    bookingId: booking._id,
                    booking: booking
                });
            });
        }
    } catch (error) {
        console.error('Error updating scheduled bookings:', error);
    }
}
// Add this to your backend controller file

exports.getBookingStats = async (req, res) => {
  const routeLogger = LoggerFactory.createChildLogger({
    route: '/booking/stats',
    handler: 'getBookingStats',
  });
  
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    const selectedDate = new Date(date);
    const yesterday = new Date(selectedDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dayBeforeYesterday = new Date(selectedDate);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
    
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    // Create date ranges
    const todayStart = new Date(`${formatDate(selectedDate)}T00:00:00.000Z`);
    const todayEnd = new Date(`${formatDate(selectedDate)}T23:59:59.999Z`);
    
    const yesterdayStart = new Date(`${formatDate(yesterday)}T00:00:00.000Z`);
    const yesterdayEnd = new Date(`${formatDate(yesterday)}T23:59:59.999Z`);
    
    const historicalEnd = new Date(`${formatDate(dayBeforeYesterday)}T00:00:00.000Z`);
    
    // Build aggregation pipelines
    const buildPipeline = (startDate, endDate = null) => {
      const matchStage = {};
      
      if (endDate) {
        matchStage.createdAt = { $gte: startDate, $lte: endDate };
      } else {
        matchStage.createdAt = { $lt: startDate };
      }
      
      return [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            newBookings: { $sum: { $cond: [{ $eq: ['$status', 'Booking Added'] }, 1, 0] } },
            completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'Order Completed'] }, 1, 0] } },
            verifiedBookings: { $sum: { $cond: ['$verified', 1, 0] } },
            feedbackBookings: { $sum: { $cond: ['$feedbackCheck', 1, 0] } },
            accountantVerifiedBookings: { $sum: { $cond: ['$accountantVerified', 1, 0] } },
            cashPendingBookings: { $sum: { $cond: ['$cashPending', 1, 0] } },
            totalBookings: { $sum: 1 }
          }
        }
      ];
    };
    
    // Execute all queries in parallel
    const [todayStats, yesterdayStats, historicalStats] = await Promise.all([
      Booking.aggregate(buildPipeline(todayStart, todayEnd)),
      Booking.aggregate(buildPipeline(yesterdayStart, yesterdayEnd)),
      Booking.aggregate(buildPipeline(historicalEnd)) // Historical data
    ]);
    
    // Default empty stats
    const defaultStats = {
      newBookings: 0,
      completedBookings: 0,
      verifiedBookings: 0,
      feedbackBookings: 0,
      accountantVerifiedBookings: 0,
      cashPendingBookings: 0,
      totalBookings: 0
    };
    
    const stats = {
      today: todayStats[0] || defaultStats,
      yesterday: yesterdayStats[0] || defaultStats,
      historical: historicalStats[0] || defaultStats
    };
    
    routeLogger.info({ selectedDate }, 'Booking stats fetched successfully');
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    routeLogger.error({ error }, 'Error fetching booking stats');
    res.status(500).json({ message: 'Server error while fetching booking stats' });
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

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/booking',
        handler: 'updateBooking',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'Update Booking  process started...');

    try {
        // Fetch the existing booking
        const booking = await Booking.findById(id);
        if (!booking) {

            routeLogger.info({
                fileNumber: booking.fileNumber,
                doneBy: req.user || 'unknown'
            }, 'Update Booking  process started...');

            return res.status(404).json({ message: 'Booking not found' });
        }
        // Handle payment settlement updates
        if (updatedData.paymentSettlement) {
            // Set receivedUser and receivedUserId when payment is settled
            if (booking.driver) {
                updatedData.receivedUser = 'Driver';
                updatedData.receivedUserId = booking.driver._id;
            } else if (booking.provider) {
                updatedData.receivedUser = 'Provider';
                updatedData.receivedUserId = booking.provider._id;
            }
            
            routeLogger.info({
                bookingId: id,
                receivedUser: updatedData.receivedUser,
                receivedUserId: updatedData.receivedUserId
            }, 'Payment settlement updated with receiver info');
        }


        if (updatedData.workType === 'PaymentWork') {
            updatedData.company = null
        }

        if (booking.status === "Rejected") {
            updatedData.status = 'Booking Added'
        }

        // Check if the body contains 'driver' and handle 'provider' if it exists
        if (updatedData.driver) {
            const booking = await Booking.findById(id); // Fetch the existing booking to check for the provider
            if (booking && booking.provider) {
                // If there's a provider and driver is being set, remove provider and set driver
                await Booking.updateOne({ _id: id }, { $unset: { provider: "" } }); // Remove provider
            }
            // Fetch driver details
            const driver = await Driver.findById(updatedData.driver);
            if (!driver) {

                routeLogger.info({
                    doneBy: req.user || 'unknown'
                }, 'Driver not found...');

                return res.status(404).json({ message: "Driver not found" });
            }

            // Find the selected vehicle for the driver
            const selectedVehicle = driver.vehicle.find(
                (item) => item.serviceType.toString() === updatedData.serviceType.toString()
            );

            if (!selectedVehicle) {

                routeLogger.info({
                    doneBy: req.user || 'unknown'
                }, 'Vehicle not found for the selected service type...');

                return res.status(404).json({ message: "Vehicle not found for the selected service type" });
            }

            updatedData.vehicleNumber = selectedVehicle.vehicleNumber
        }

        // Check if the body contains 'provider' and handle 'driver' if it exists
        if (updatedData.provider) {
            const booking = await Booking.findById(id); // Fetch the existing booking to check for the driver
            if (booking && booking.driver) {
                // If there's a driver and provider is being set, remove driver and set provider
                await Booking.updateOne({ _id: id }, { $unset: { driver: "" } }); // Remove driver
            }
        }
        // Handle uploaded images
        if (req.files && req.files.length > 0) {
            if (updatedData.dropoffTime) {
                updatedData.dropoffImages = req.files.map(file => file.filename);
            } else {
                updatedData.pickupImages = req.files.map(file => file.filename);
            }
        }

        // update driver transfer amount
        if (updatedData.transferedSalary) {
            const newTransferedSalary = (booking.transferedSalary || 0) + updatedData.transferedSalary;
            if (newTransferedSalary !== booking.driverSalary) {
                return res.status(400).json({
                    message: 'Driver Transfer amount should be equal to Driver Salary'
                });
            }
            updatedData.transferedSalary = newTransferedSalary
        }

        if (updatedData.invoiceNumber) {
            booking.invoiceNumber = updatedData.invoiceNumber
            // booking.invoiceStatus = 
        }

        // If the total ammount changed then check with redeemed if redeem for this booking
        if (
            booking.rewardAmount !== updatedData.rewardAmount && updatedData.totalAmount
        ) {
            updatedData.totalAmount -= Number(updatedData.rewardAmount) || 0;
            updatedData.rewardAmount = Number(updatedData.rewardAmount) || 0;
        }

        const updatedBooking = await Booking.findByIdAndUpdate(id, updatedData, { new: true })
            .populate('baselocation') // Populate related documents
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .populate('provider')
                .exec(); // Add .exec() to properly handle the promise


        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        // Notify booking update for realtime udpate 
        // emit an event to socket connection for realtime changes
        io.emit("newChanges", {
            type: 'update',
            bookingId: updatedBooking._id,
            status: updatedBooking.status,
            updatedBooking

        });

       let receiver = updatedBooking.driver || updatedBooking.provider;
let receiverOld = (booking.driver ? booking.driver._id : null) || (booking.provider ? booking.provider._id : null);

const isDifferentReceiver = receiver?._id?.toString() !== receiverOld?.toString();
        if (receiver?.fcmToken && isDifferentReceiver) {
            const notificationResult = await NotificationService.sendNotification({
                token: receiver?.fcmToken || '',
                title: "Booking Edited",
                body: 'A booking assigned to you has been edited.',
                sound: 'alert'
            });
            console.log('notificationResult', notificationResult)
        }

        routeLogger.info({
            fileNumber: updatedBooking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Booking updated successfully...');

        res.status(200).json({ message: 'Booking updated successfully', booking: updatedBooking });
    }  catch (error) {
  routeLogger.error({
    error: error.message,
    stack: error.stack,
    bookingId: id
  }, 'Error updating booking');
  res.status(500).json({ message: 'Error updating booking', error: error.message });
}
};

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

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/booking',
            handler: 'updateBooking',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'Update Booking pickup details process started...');

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
        // emit an event to socket connection for realtime changes
        io.emit("newChanges", {
            type: 'update',
            bookingId: updatedBooking._id,
            status: updatedBooking.status
        })

        routeLogger.info({
            fileNumber: updatedBooking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Pickup Details updated successfully...');

        res.status(200).json({
            message: 'Booking updated successfully.',
            booking: updatedBooking,
        });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
};
exports.uploadImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filename = req.file.filename;
    res.status(200).json({ filename });
};

// remove the pickup image 
exports.changePickupImages = async (req, res) => {
    const { id, index } = req.params;

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/booking',
        handler: 'updateBooking',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to update the pickup image for the booking has started....');

    if (!id) {
        return res.status(400).json({ message: "ID is required" });
    }

    try {
        // Find the booking by ID
        let booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Check if the index is valid
        if (index < 0 || index >= booking.pickupImages.length) {
            return res.status(400).json({ message: "Invalid index" });
        }

        // Save the updated booking
        booking.pickupImages[index] = req?.file?.filename || booking.pickupImages[index];

        if (booking.pickupImages.length < 3) {
            booking.pickupImagePending = true
        } else {
            booking.pickupImagePending = false
        }

        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Pickup image changes updated successfully...');

        res.status(200).json({
            message: "Image removed successfully",
            pickupImagePending: booking.pickupImagePending,
        });
    } catch (error) {
        console.error("Error removing pickup image:", error);
        res.status(500).json({ error: error.message });
    }
};

// add pickup images
exports.addPickupImages = async (req, res) => {
    const { id } = req.params;

    try {
        const routeLogger = LoggerFactory.createChildLogger({
            route: '/add-pickup-image',
            handler: 'addPickupImages',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to add the pickup image for the booking has started....');

        // Find the booking document by ID
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Validate files were uploaded
        if (!req.files || !req.files.length) {
            return res.status(400).json({ message: 'No images were uploaded.' });
        }

        // Get new image paths with validation
        const newImages = req.files.map(file => {
            if (!file.filename) {
                routeLogger.warn('File missing filename property', { file });
                throw new Error('Invalid file upload');
            }
            return file.filename;
        });

        routeLogger.info(`Processing ${newImages.length} new images`);

        // Calculate the total number of images
        const totalImages = booking.pickupImages.length + newImages.length;

        if (totalImages > 6) {
            return res.status(400).json({
                message: `Limit exceeded. You can upload a maximum of 6 images for pickup images. You already have ${booking.pickupImages.length} images.`,
            });
        }

        // Add retry mechanism for database save
        const maxRetries = 3;
        let retryCount = 0;
        let savedSuccessfully = false;

        while (retryCount < maxRetries && !savedSuccessfully) {
            try {
                // Use atomic update to prevent race conditions
                const updatedBooking = await Booking.findByIdAndUpdate(
                    id,
                    {
                        $push: { 
                            pickupImages: { 
                                $each: newImages 
                            } 
                        },
                        $set: { 
                            pickupImagePending: booking.pickupImages.length + newImages.length < 3 
                        }
                    },
                    { 
                        new: true,
                        runValidators: true 
                    }
                );

                if (!updatedBooking) {
                    throw new Error('Booking update failed');
                }

                savedSuccessfully = true;
                booking.pickupImages = updatedBooking.pickupImages;
                booking.pickupImagePending = updatedBooking.pickupImagePending;

                routeLogger.info({
                    fileNumber: booking.fileNumber || 'unknown',
                    doneBy: req.user || 'unknown',
                    imagesAdded: newImages.length,
                    totalImages: updatedBooking.pickupImages.length
                }, 'Pickup images added successfully....');

            } catch (dbError) {
                retryCount++;
                routeLogger.warn(`Database save attempt ${retryCount} failed`, {
                    error: dbError.message,
                    retryCount
                });

                if (retryCount === maxRetries) {
                    throw new Error(`Failed to save after ${maxRetries} attempts: ${dbError.message}`);
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        res.status(200).json({
            message: 'Pickup images added successfully',
            pickupImages: booking.pickupImages,
            pickupImagePending: booking.pickupImagePending,
            imagesAdded: newImages.length,
            totalImages: booking.pickupImages.length
        });

    } catch (error) {
        console.error('Error in addPickupImages:', error);
        
        // Log detailed error information
        routeLogger.error({
            error: error.message,
            stack: error.stack,
            bookingId: id,
            filesCount: req.files ? req.files.length : 0
        }, 'Failed to add pickup images');

        res.status(500).json({ 
            message: 'Error updating booking', 
            error: error.message,
            suggestion: 'Please try uploading the images again'
        });
    }
};

// remove the dropoff image 
exports.changeDropoffImages = async (req, res) => {
    const { id, index } = req.params;

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/change-pickup-image',
        handler: 'changeDropoffImages',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to change the pickup image for the booking has started....');

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

        // Check after removal
        booking.dropoffImagePending = dropoffImages.length < 3;

        // Save the updated booking
        booking.dropoffImages[index] = req?.file?.filename || booking.dropoffImages[index];
        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'DropOf Image removed successfully....');

        res.status(200).json({
            message: "Image removed successfully",
            dropoffImagePending: booking.dropoffImagePending,

        });
    } catch (error) {
        console.error("Error removing dropoff image:", error);
        res.status(500).json({ error: error.message });
    }
};
// Add these new endpoints to your backend

// Remove pickup image
exports.removePickupImage = async (req, res) => {
    const { id, index } = req.params;

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (index < 0 || index >= booking.pickupImages.length) {
            return res.status(400).json({ message: "Invalid index" });
        }

        // Remove the image from the array
        booking.pickupImages.splice(index, 1);
        
        // Update pending status
        booking.pickupImagePending = booking.pickupImages.length < 3;
        
        await booking.save();

        res.status(200).json({
            message: "Image removed successfully",
            pickupImagePending: booking.pickupImagePending,
        });
    } catch (error) {
        console.error("Error removing pickup image:", error);
        res.status(500).json({ error: error.message });
    }
};

// Remove dropoff image
exports.removeDropoffImage = async (req, res) => {
    const { id, index } = req.params;

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (index < 0 || index >= booking.dropoffImages.length) {
            return res.status(400).json({ message: "Invalid index" });
        }

        // Remove the image from the array
        booking.dropoffImages.splice(index, 1);
        
        // Update pending status
        booking.dropoffImagePending = booking.dropoffImages.length < 3;
        
        await booking.save();

        res.status(200).json({
            message: "Image removed successfully",
            dropoffImagePending: booking.dropoffImagePending,
        });
    } catch (error) {
        console.error("Error removing dropoff image:", error);
        res.status(500).json({ error: error.message });
    }
};
// Remove all dropoff images at once
exports.removeAllDropoffImages = async (req, res) => {
    const { id } = req.params;

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Remove all dropoff images by setting the array to empty
        booking.dropoffImages = [];
        
        // Set pending status to true since all images are removed
        booking.dropoffImagePending = true;
        
        await booking.save();

        res.status(200).json({
            message: "All dropoff images removed successfully",
            dropoffImages: booking.dropoffImages,
            dropoffImagePending: booking.dropoffImagePending,
        });
    } catch (error) {
        console.error("Error removing all dropoff images:", error);
        res.status(500).json({ error: error.message });
    }
};
// add dropoff images
exports.addDropoffImages = async (req, res) => {
    const { id } = req.params;
    const routeLogger = LoggerFactory.createChildLogger({
        route: '/change-pickup-image',
        handler: 'changeDropoffImages',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to add the dropOf image for the booking has started....');

    try {
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Validate uploaded files
        if (!req.files || !req.files.length) {
            return res.status(400).json({ message: 'No images were uploaded.' });
        }

        const newImages = req.files.map(file => {
            if (!file.filename) {
                routeLogger.warn('File missing filename property', { file });
                throw new Error('Invalid file upload');
            }
            return file.filename;
        });

        routeLogger.info(`Processing ${newImages.length} new dropoff images`);

        // Check image limit (uncomment if needed)
        // const totalImages = booking.dropoffImages.length + newImages.length;
        // if (totalImages > 6) {
        //     return res.status(400).json({ message: `Limit exceeded. Max 6 images allowed. Current: ${booking.dropoffImages.length}` });
        // }

        // Retry mechanism for database save
        const maxRetries = 3;
        let retryCount = 0;
        let savedSuccessfully = false;

        while (retryCount < maxRetries && !savedSuccessfully) {
            try {
                const updatedBooking = await Booking.findByIdAndUpdate(
                    id,
                    {
                        $push: { 
                            dropoffImages: { 
                                $each: newImages 
                            } 
                        },
                        $set: { 
                            dropoffImagePending: booking.dropoffImages.length + newImages.length < 3 
                        }
                    },
                    { 
                        new: true,
                        runValidators: true 
                    }
                );

                if (!updatedBooking) {
                    throw new Error('Booking update failed');
                }

                savedSuccessfully = true;
                booking.dropoffImages = updatedBooking.dropoffImages;
                booking.dropoffImagePending = updatedBooking.dropoffImagePending;

                routeLogger.info({
                    fileNumber: booking.fileNumber || 'unknown',
                    doneBy: req.user || 'unknown',
                    imagesAdded: newImages.length,
                    totalImages: updatedBooking.dropoffImages.length
                }, 'Dropoff images added successfully....');

            } catch (dbError) {
                retryCount++;
                routeLogger.warn(`Database save attempt ${retryCount} failed`, {
                    error: dbError.message,
                    retryCount
                });

                if (retryCount === maxRetries) {
                    throw new Error(`Failed to save after ${maxRetries} attempts: ${dbError.message}`);
                }

                // Exponential backoff before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        res.status(200).json({
            message: 'Dropoff images added successfully',
            dropoffImages: booking.dropoffImages,
            dropoffImagePending: booking.dropoffImagePending,
            imagesAdded: newImages.length,
            totalImages: booking.dropoffImages.length
        });

    } catch (error) {
        console.error('Error in addDropoffImages:', error);
        routeLogger.error({
            error: error.message,
            stack: error.stack,
            bookingId: id,
            filesCount: req.files ? req.files.length : 0
        }, 'Failed to add dropoff images');

        res.status(500).json({ 
            message: 'Error updating booking', 
            error: error.message,
            suggestion: 'Please try uploading the images again'
        });
    }
};

//Editing filenumber 
exports.updateFilenumber = async (req, res) => {
    const { fileNumber } = req.body;
    const { id } = req.params;

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/change-pickup-image',
        handler: 'changeDropoffImages',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to add the fileNumber for the booking has started....');

    try {
        // Find the booking by ID and update the fileNumber
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        booking.fileNumber = fileNumber; // Update the fileNumber
        await booking.save(); // Save the updated booking

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Filenumber updated successfully....');

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
        const verifiedBy = req.user.id || req.user._id;// Get the user ID from the authenticated request

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/verifyBooking',
            handler: 'verifyBooking',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to verify  the booking has started....');

        // Fetch the booking details
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
// Check image counts and update pending flags
        const pickupImageCount = booking.pickupImages ? booking.pickupImages.length : 0;
        const dropoffImageCount = booking.dropoffImages ? booking.dropoffImages.length : 0;
        
        // Update pending flags based on image counts
        booking.pickupImagePending = pickupImageCount < 3;
        booking.dropoffImagePending = dropoffImageCount < 3;
        
        // Save the updated pending flags
        await booking.save();
        if (booking.cashPending) {
            return res.status(400).json({ message: 'Cannot verify. Cash is pending.' });
        }
        if (booking.pickupImagePending) {
            return res.status(400).json({ message: 'Pickup images are pending. Minimum 3 images required.' });
        }
        if (booking.dropoffImagePending) {
            return res.status(400).json({ message: 'Dropoff images are pending. Minimum 3 images required.' });
        }
        if (booking.inventoryImagePending && !booking.inventoryImage) {
            return res.status(400).json({ message: 'Inventory Image is pending.' });
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

        const updateData = {
            verified: true,
            verifiedBy: new mongoose.Types.ObjectId(verifiedBy), // Add the user who verified the booking
            verifiedAt: new Date(), // Add timestamp of verification
              pickupImagePending: booking.pickupImagePending,
            dropoffImagePending: booking.dropoffImagePending
        };
        if (booking.provider) {
            updateData.feedbackCheck = true;
        }
        const updatedBooking = await Booking.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).populate({
            path: 'verifiedBy',
            select: 'name email', // Only populate these fields
            model: 'Staff' // Explicitly specify the model
        });
        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }
// Call the vehicle service status check function after successful verification
        if (booking.driver && booking.totalDriverDistence) {
            const vehicleStatusResult = await checkVehicleServiceStatus(updatedBooking);
            if (!vehicleStatusResult.success) {
                routeLogger.warn({
                    bookingId: id,
                    error: vehicleStatusResult.message
                }, 'Vehicle service status update failed');
            } else {
                routeLogger.info({
                    bookingId: id,
                    vehicleId: vehicleStatusResult.vehicleId,
                    newOdometerValue: vehicleStatusResult.newOdometerValue
                }, 'Vehicle service status updated successfully');
            }
        }
        routeLogger.info({
            fileNumber: updatedBooking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Booking verified successfully....');

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

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/create-feedback',
            handler: 'postFeedback',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to change the pickup image for the booking has started....');

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
                const updated = await Driver.findByIdAndUpdate(
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

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Feedback created success....');

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

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/verify-accountant',
        handler: 'accountVerifying',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to verify the accountant for the booking has started....');

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

        routeLogger.info({
            fileNumber: updatedBooking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Accountant verified successfully.....');

        res.status(200).json({
            message: '',
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
        let { search, startDate, endDate, page = 1, limit = 10, showAll = false } = req.query;

        // Convert page and limit to integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        // If showAll is true, set limit to a very high number
        if (showAll === 'true') {
            limit = 1000000; // Or use Number.MAX_SAFE_INTEGER for all records
        }
        // Base query for approved bookings
        const query = {
            status: "Order Completed", // Filter only bookings with this status
            accountantVerified: true,  // Ensure accountantVerified is true
        };

        // Handle search
        if (search) {
            // Overridinf the custom plugin
            query._includeHidden = true;

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
 // Search in company names
                const matchingCompanies = await Company.find({ 
                    $or: [
                        { name: searchRegex },
                        { phone: searchRegex }
                    ]
                }).select('_id');
                query.$or = [
                    { customerName: searchRegex }, // Replaced fileNumber with customerName
                    { mob1: searchRegex },
                    { fileNumber: searchRegex },
                    { customerVehicleNumber: searchRegex },
                    { bookedByModel: searchRegex },
                    { driver: { $in: matchingDrivers.map(d => d._id) } },
                    { provider: { $in: matchingProviders.map(p => p._id) } },
                                        { company: { $in: matchingCompanies.map(c => c._id) } }, // Added company search

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
          .skip(showAll === 'true' ? 0 : (page - 1) * limit)
            .limit(showAll === 'true' ? Number.MAX_SAFE_INTEGER : limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            total,
            page,
            limit: showAll === 'true' ? total : limit, // Return actual limit used
            totalPages: showAll === 'true' ? 1 : Math.ceil(total / limit),
            bookings,
            showAll: showAll === 'true'
        });
    } catch (error) {
        console.error('Error fetching approved bookings:', error);
        res.status(500).json({ message: 'Server error while fetching approved bookings' });
    }
};

exports.getAllBookingsBasedOnStatus = async (req, res) => {
    try {
        let { status = '', search, page = 1, limit = 10, showAll = false } = req.query;

        // Convert page and limit to integers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        if (showAll === 'true') {
            limit = 1000000; // Or use Number.MAX_SAFE_INTEGER for all records
        }

        let query = {};
        let statusConditions = {};

        // Handle status conditions first
        if (status === "Order Completed") {
            statusConditions = {
                status: "Order Completed",
                $or: [
                    { cashPending: false },
                    { cashPending: { $exists: false } }
                ]
            };
        } else if (status === "OngoingBookings") {
            statusConditions = {
                status: {
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
                        "Booking Added",
                        "Rejected"
                    ]
                },
                $or: [
                    { cashPending: false },
                    { cashPending: { $exists: false } }
                ]
            };
        } else if (status === "CashPendingBookings") {
            statusConditions = { cashPending: true };
        }

        // Handle search conditions
        if (search) {
            query._includeHidden = true;
            search = search.trim();
            const searchRegex = new RegExp(search.replace(/\s+/g, ''), 'i');
            const matchingDrivers = await Driver.find({ name: searchRegex }).select('_id');

            const searchConditions = {
                $or: [
                    { fileNumber: searchRegex },
                    { mob1: searchRegex },
                    { customerVehicleNumber: searchRegex },
                    { customerName: searchRegex },
                    { bookedByModel: searchRegex },
                    { driver: { $in: matchingDrivers.map(d => d._id) } },
                ]
            };

            // Combine search and status conditions with AND logic
            if (Object.keys(statusConditions).length > 0) {
                query.$and = [
                    statusConditions,
                    searchConditions
                ];
            } else {
                query = searchConditions;
            }
        } else {
            query = statusConditions;
        }

        const total = await Booking.countDocuments(query);

        const bookings = await Booking.find(query)
            .populate('baselocation')
            .populate('showroom')
            .populate('serviceType')
            .populate('company')
            .populate('driver')
            .skip(showAll === 'true' ? 0 : (page - 1) * limit) // Skip only if not showing all
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            bookings,
            total,
            page: showAll === 'true' ? 1 : page,
            limit: showAll === 'true' ? total : limit,
            totalPages: showAll === 'true' ? 1 : Math.ceil(total / limit),
            showAll: showAll === 'true'
        });
    } catch (error) {
        console.error('Error fetching bookings:', error.message);
        res.status(500).json({ message: 'Server error while fetching bookings' });
    }
};

// Controller to settle booking amount 
exports.settleAmount = async (req, res) => {
   try {
        const routeLogger = LoggerFactory.createChildLogger({
            route: '/settle-amount',
            handler: 'settleAmount',
        });
        
        const { id } = req.params;
        const { partialAmount, receivedUser, role, receivedAmount, receivedUserId } = req.body;
        const currentUserId = req.user.id || req.user._id; // The user making the request
 // VALIDATION: Check if amount is not zero
        const amount = Number(partialAmount || receivedAmount || 0);
        if (amount === 0) {
            return res.status(400).json({ 
                message: 'Amount cannot be zero. Please provide a valid amount.' 
            });
        }
        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.workType === 'RSAWork') {
            return res.status(400).json({
                message: 'For RSAWork bookings, please use the settleAmountCompany endpoint'
            });
        }

        // Creating the receivedHistory object
        const receivedHistory = {
            role: receivedUser || 'Admin',
            receivedUser: currentUserId, // The user who processed the payment
            amount: receivedAmount || partialAmount
        };

        booking.receivedHistory.push(receivedHistory);
   if (receivedUser) {
    // Check if current receivedUser is different from new receivedUser AND roles are different
    if (booking.receivedUser && booking.receivedUser !== receivedUser) {
        booking.multipleReceivedUser = true; // Set flag if different users
        // Only update previousReceivedUser when the roles are different
        booking.previousReceivedUser = booking.receivedUser;
        booking.previousReceivedUserId = booking.receivedUserId;
    }
            
            // Use receivedUserId if provided (for Drivers), otherwise use current user ID
            const targetUserId = receivedUser === 'Driver' ? receivedUserId : currentUserId;
            
            booking.receivedUserId = targetUserId;
            booking.receivedUser = receivedUser;
            
            if (receivedUser === 'Driver') {
                booking.receivedAmountDriver = (booking.receivedAmountDriver || 0) + Number(partialAmount || receivedAmount || 0);
            } else if (receivedUser === 'Staff') {
                booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + Number(partialAmount || receivedAmount || 0);
            }

            const ReceivedUserModel = mongoose.model(receivedUser || "Driver");

            // Update the target user's cash in hand
            await ReceivedUserModel.findByIdAndUpdate(targetUserId, {
                $inc: {
                    cashInHand: Number(partialAmount || 0)
                }
            });
        }
        // Rest of your existing code remains the same...
        // Update partial or amount to booking
        if (booking.company) {
            const currentAmount = Number(booking.receivedAmountByCompany) || 0;
            const amountToAdd = Number(partialAmount || receivedAmount) || 0;

            booking.receivedAmountByCompany = currentAmount + amountToAdd;
            booking.receivedAmount = amountToAdd;
            if (booking.totalAmount <= booking.receivedAmountByCompany) {
                booking.cashPending = false;
            }
        } else {
            if (receivedAmount && !role) {
                booking.receivedAmount = receivedAmount;
            } else {
                booking.partialAmount = booking.partialAmount || 0;
                booking.partialAmount += Number(partialAmount || 0);
                if (booking.partialAmount < booking.totalAmount) {
                    booking.partialPayment = true;
                    booking.cashPending = true;
                } else if (booking.partialAmount === booking.totalAmount) {
                    booking.partialPayment = false;
                    booking.cashPending = false;
                }
            }
        }

        // Condition for valid amount if the amount more than total amount this will handled
        if (!booking.company && booking.totalAmount <= booking.partialAmount) {
            booking.partialAmount = booking.receivedAmount;
            booking.partialPayment = false;
            booking.cashPending = false;
        }
        
        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Settle amount updated successfully....');

        return res.status(200).json({
            message: "Settle amount updated",
            booking
        });

    } catch (error) {
        console.error('Error settling booking amount:', error.message);
        res.status(500).json({ message: 'Server error while settling booking amount.' });
    }
};
exports.settleAmountCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { receivedAmountByCompany } = req.body;

        // Validate input
        if (typeof receivedAmountByCompany !== 'number' || receivedAmountByCompany < 0) {
            return res.status(400).json({
                message: 'Invalid amount provided. Must be a positive number.'
            });
        }

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        // Update only the necessary fields
        booking.receivedAmountByCompany = Number(receivedAmountByCompany);

        // Check if payment is complete
        if (booking.totalAmount <= booking.receivedAmountByCompany) {
            booking.cashPending = false;
        }

        await booking.save();

        return res.status(200).json({
            message: "Company amount updated successfully",
            booking
        });

    } catch (error) {
        console.error('Error updating company amount:', error.message);
        res.status(500).json({
            message: 'Server error while updating company amount',
            error: error.message
        });
    }
};
// Controller for settling staff amounts
exports.settleStaffAmount = async (req, res) => {
    try {
        const routeLogger = LoggerFactory.createChildLogger({
            route: '/settle-staff-amount',
            handler: 'settleStaffAmount',
        });
        routeLogger.info({
            doneBy: req.user || 'admin' // Admin is always handling staff settlements
        }, 'Staff settlement process started');

        const { id } = req.params;
        const { givenAmountByStaff } = req.body;

        // Validate input
        if (isNaN(givenAmountByStaff)) {
            return res.status(400).json({
                message: 'Invalid amount provided'
            });
        }

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        // Validate staff-specific conditions
        if (booking.receivedUser !== 'Staff' && booking.previousReceivedUser !== 'Staff') {
            return res.status(400).json({
                message: 'This booking is not assigned to staff'
            });
        }

        // Update staff-specific fields
        booking.givenAmountByStaff = Number(givenAmountByStaff);

        // Check if fully settled
        if (booking.givenAmountByStaff >= booking.receivedAmountStaff) {
            booking.givenAmountByStaff = booking.receivedAmountStaff; // Prevent overpayment
            booking.cashPending = false;
            booking.partialPayment = false;
        } else {
            booking.cashPending = true;
            booking.partialPayment = true;
        }

        // No receivedHistory needed as per requirements
        // Admin is always the receiver in this case

        await booking.save();

        routeLogger.info({
            bookingId: booking._id,
            fileNumber: booking.fileNumber,
            amountSettled: booking.givenAmountByStaff
        }, 'Staff amount settled successfully');

        return res.status(200).json({
            message: "Staff amount settled successfully",
            booking: {
                _id: booking._id,
                fileNumber: booking.fileNumber,
                receivedAmountStaff: booking.receivedAmountStaff,
                givenAmountByStaff: booking.givenAmountByStaff,
                balance: booking.receivedAmountStaff - booking.givenAmountByStaff,
                cashPending: booking.cashPending
            }
        });

    } catch (error) {
        console.error('Error settling staff amount:', error.message);
        res.status(500).json({
            message: 'Server error while settling staff amount',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
//Controller to settle booking amount 
exports.settleAmountDriver = async (req, res) => {
    try {
        const routeLogger = LoggerFactory.createChildLogger({
            route: '/settle-amount',
            handler: 'settleAmount',
        });
        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to settle amount the booking has started....');

        const { id } = req.params;
        const { partialAmount, receivedUser } = req.body;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        if (partialAmount === booking.totalAmount) {
            booking.cashPending = false;
        } else {
            booking.cashPending = true;
            booking.partialPayment = true
            booking.partialAmount = partialAmount;
        }
        if (!booking.company && booking.totalAmount <= booking.partialAmount) {
            booking.partialAmount = booking.receivedAmount;
            booking.partialPayment = false;
            booking.cashPending = false;
        }
        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Settle amount updated successfully....');

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

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/updateBookingApproved',
            handler: 'updateBookingApproved',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to approve the booking has started....');

        const { id } = req.params

        const { approve } = req.body; // Get the approve status from request body

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        // Update the approve field
        booking.approve = approve !== undefined ? approve : true; // Default to true if not specified

        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Booking approved successfully....');

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
//---------------------
//Controller for distribute received amount
exports.distributeReceivedAmount = async (req, res) => {
    const { receivedAmount, driverId, bookingIds, workType = 'RSAWork' } = req.body;
    const userId = req.user.id || req.user._id; // Get the staff user ID from the request
    const userRole = req.user.role; // Get the user's role from the request

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/distributeReceivedAmount',
        handler: 'distributeReceivedAmount',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to distributeReceivedAmount for the booking has started....');

    try {
        let remainingAmount = receivedAmount;
        const selectedBookingIds = [];
        const updatedBookings = [];


        let receivedField = workType === 'PaymentWork' ? '$receivedAmountByCompany' : '$receivedAmount';

        // Fetch bookings from DB where receivedUser is NOT "Staff" and balance > 0
        const bookings = await Booking.find({
            _id: { $in: bookingIds },
            workType: { $ne: workType },
            $expr: { $gt: ["$totalAmount", { $ifNull: [receivedField, 0] }] }
        }).sort({ createdAt: -1 });

        // Update bookings by distributing receivedAmount
        for (const booking of bookings) {
            if (remainingAmount <= 0) break; // Stop if amount is fully distributed

            const bookingBalance = booking.totalAmount - (booking.receivedAmount || 0);
            if (bookingBalance > 0) {
                const appliedAmount = Math.min(remainingAmount, bookingBalance);

                // Handle Staff payments or non-Staff users updating Staff payments
                if (booking.receivedUser === 'Staff' || (userRole !== 'Staff' && booking.partialReceivedAmountStaff === true)) {
                    // Update both receivedAmountStaff and givenAmountByStaff
                    booking.receivedAmountStaff = (booking.receivedAmountStaff || 0) + appliedAmount;

                    // For non-Staff users, also update givenAmountByStaff
                    if (userRole !== 'Staff') {
                        booking.givenAmountByStaff = (booking.givenAmountByStaff || 0) + appliedAmount;
                    }

                    // Check if payment is now complete
                    if (booking.receivedAmountStaff >= booking.totalAmount) {
                        booking.partialReceivedAmountStaff = false;
                        booking.receivedAmount = booking.totalAmount; // Mark as fully received
                    } else {
                        booking.partialReceivedAmountStaff = true;
                    }
                } else {
                    // For regular non-Staff payments
                    booking.receivedAmount = (booking.receivedAmount || 0) + appliedAmount;
                }

                // Set the receivedUser and receivedUserId fields if not already set
                if (!booking.receivedUser || booking.receivedUser !== 'Staff') {
                    booking.receivedUser = userRole === 'Staff' ? 'Staff' : 'Admin'; // Or appropriate role
                    booking.receivedUserId = new mongoose.Types.ObjectId(userId);
                }

                remainingAmount -= appliedAmount;
                selectedBookingIds.push(booking._id);
                updatedBookings.push(await booking.save());
            }
        }

        //Deduct remaining amount from driver's advance
        const deductRemainingFromAdvance = async (remainingAmount, driverId) => {
            try {
                const driver = await Driver.findById(driverId);
                if (!driver) {
                    throw new Error("Driver not found");
                }
                if (driver.advance && driver.advance > 0) {
                    driver.advance -= remainingAmount;
                }
                await driver.save();
            } catch (error) {
                console.error("Error deducting from driver advance:", error);
                throw new Error("Failed to deduct advance amount");
            }
        };

        // Deduct remaining amount from the driver's advance if not fully used
        if (remainingAmount > 0) {
            await deductRemainingFromAdvance(remainingAmount, driverId);
        }

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'Amount distributed successfully....');

        return res.status(200).json(
            { message: "Amount distributed successfully" }
        )
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            message: error.message
        })
    }
}

//Controller for udpate driver balance salary
exports.updateBalanceSalary = async (req, res) => {
    const { bookingIds, totalAmount, DriverType = "Driver", transactionId } = req.body

    const routeLogger = LoggerFactory.createChildLogger({
        route: '/updateBalanceSalary',
        handler: 'updateBalanceSalary',
    });

    routeLogger.info({
        doneBy: req.user || 'unknown'
    }, 'The process to update booking balance driver salary has started....');

    try {
        let amount = Number(totalAmount) || 0;

        const bookings = await Booking.find({
            _id: { $in: bookingIds }
        })

        for (const booking of bookings) {
            let balanceSalary = (Number(booking.driverSalary) || 0) - (Number(booking.transferedSalary) || 0);

            const transferAmount = Math.min(balanceSalary, amount);

            booking.transferedSalary = (Number(booking.transferedSalary) || 0) + transferAmount
            amount -= transferAmount;

            await booking.save();

            if (amount <= 0) break;
        }

        const newSalaryTransaction = new SalaryTransaction({
            driver: bookings[0].driver || bookings[0].provider,
            userModel: DriverType,
            transactionId,
            amount: totalAmount
        })
        await newSalaryTransaction.save();

        routeLogger.info({
            bookingIds: bookingIds || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Driver balance salary updated successfully....');

        return res.status(200).json({
            message: "Driver balance salary updated successfully",
            remainingAmount: amount
        });

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            message: error.message
        })
    }
}

// Controller for get booking for showroom dashboard 
exports.getBookingsForShowroom = async (req, res) => {
    try {
        const {
            showroom,
            status,
            serviceType,
            serviceCategory,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 10,
            staffId
        } = req.query;

        // Validate required showroom
        if (!showroom || !mongoose.Types.ObjectId.isValid(showroom)) {
            return res.status(400).json({
                success: false,
                message: 'Valid showroom is required'
            });
        }

        // Build base query
        const query = {
            showroom: new mongoose.Types.ObjectId(showroom)
        };

        // Add status filter if provided
        if (status) {
            if (Array.isArray(status)) {
                query.status = { $in: status };
            } else {
                query.status = status;
            }
        }

        // Add service category filter
        if (serviceCategory) {
            query.serviceCategory = serviceCategory;
        }

        // Search functionality
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { fileNumber: searchRegex },
                { customerName: searchRegex },
                { customerVehicleNumber: searchRegex },
                { mob1: searchRegex }
            ];
        }

        // Staff-specific filter (if staffId is provided)
        if (staffId && mongoose.Types.ObjectId.isValid(staffId)) {
            const staff = await ShowroomStaff.findById(staffId);
            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff member not found'
                });
            }
        }

        // Convert page and limit to numbers
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        // Population configuration
        const populationOptions = [
            { path: 'showroom', select: 'name location phone' },
        ];

        // Execute query with pagination
        const [total, bookings] = await Promise.all([
            Booking.countDocuments(query),
            Booking.find(query)
                .populate(populationOptions)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean()
        ]);

        // Format response
        const response = {
            success: true,
            data: {
                bookings,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                },
                // stats: stats[0] || {
                //     totalBookings: 0,
                //     totalRevenue: 0,
                //     pendingBookings: 0,
                //     completedBookings: 0
                // }
            }
        };
        console.log(query)
        res.status(200).json(response);

    } catch (error) {
        console.error('Error in getBookingsForShowroom:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching showroom bookings',
            error: error.message
        });
    }
};

exports.getBookingsForShowroomStaff = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 10 } = req.query;
        const staffId = new mongoose.Types.ObjectId(req.user.id);

        // Build query with proper status handling
        const query = { createdBy: staffId };

        // Handle status (array or single value)
        if (status) {
            if (Array.isArray(status)) {
                query.status = { $ne: "Order Completed" };
            } else {
                query.status = status;
            }
        }

        // Handle search
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { fileNumber: searchRegex },
                { customerName: searchRegex },
                { customerVehicleNumber: searchRegex },
                { mob1: searchRegex }
            ];
        }

        console.log("Final query:", JSON.stringify(query, null, 2));

        // Execute queries
        const [total, bookings] = await Promise.all([
            Booking.countDocuments(query),
            Booking.find(query)
                .populate({
                    path: 'showroom',
                    select: 'name location phone',
                    options: { lean: true }
                })
                .sort({ createdAt: -1 })
                .skip((parseInt(page, 10) - 1) * parseInt(limit, 10))
                .limit(parseInt(limit, 10))
                .lean()
                .exec()
        ]);

        // Populate bookedBy
        const populatedBookings = await Promise.all(
            bookings.map(async (booking) => {
                if (booking.createdBy && booking.bookedByModel) {
                    try {
                        const model = mongoose.model(booking.bookedByModel);
                        booking.createdBy = await model.findById(booking.createdBy)
                            .select('name')
                            .lean()
                            .exec();
                    } catch (err) {
                        console.error(`Population error: ${err.message}`);
                        booking.createdBy = { name: 'Unknown' };
                    }
                }
                return booking;
            })
        );

        // Format response
        res.status(200).json({
            success: true,
            data: {
                bookings: populatedBookings,
                pagination: {
                    total,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages: Math.ceil(total / parseInt(limit, 10))
                }
            }
        });

    } catch (error) {
        console.error('Error in getBookingsForShowroomStaff:', error);
        const statusCode = error.name === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: 'Error processing bookings request',
            error: process.env.NODE_ENV === 'development'
                ? error.message
                : 'Internal server error'
        });
    }
};

// Controller for cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const cancelData = req.body;

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/cancelBooking',
            handler: 'cancelBooking',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to cancel booking has started....');

        if (!cancelData.cancelReason || !cancelData.cancelKm) {
            return res.status(400).json({
                message: 'All fields are required.',
                success: false
            });
        }

        if (!req.file && !req.file.filename) {
            return res.status(400).json({
                message: 'Please upload image',
                success: false
            });
        }

        const image = req.file.filename

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found',
                success: false
            });
        }

        if (booking.cancelStatus) {
            return res.status(409).json({
                message: 'This booking is already canceled',
                success: false
            });
        }

        booking.cancelImage = image;
        booking.cancelStatus = true;
        booking.cancelReason = cancelData.cancelReason;
        booking.status = "Cancelled"
        booking.cancelKm = cancelData.cancelKm;

        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Booking Canceled success.....');

        return res.status(200).json({
            message: "Booking Canceled.",
            success: true,
            booking
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}
// Controller for inventory booking
exports.inventoryBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const routeLogger = LoggerFactory.createChildLogger({
            route: '/inventoryBooking',
            handler: 'inventoryBooking',
        });

        routeLogger.info({
            doneBy: req.user || 'unknown'
        }, 'The process to update inventory image has started....');

        if (!req.file || !req.file.filename) {
            return res.status(400).json({
                message: 'Please upload an image.',
                success: false
            });
        }

        const image = req.file.filename;

        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found.',
                success: false
            });
        }

        booking.inventoryImage = image;
        booking.inventoryImagePending = false
        await booking.save();

        routeLogger.info({
            fileNumber: booking.fileNumber || 'unknown',
            doneBy: req.user || 'unknown'
        }, 'Inventory image added success.....');

        return res.status(200).json({
            message: 'Inventory image added.',
            success: true,
            booking
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Controller for settle cash pending booking
exports.settleCashPendingBooking = asyncErrorHandler(async (req, res) => {
    const bookingId = req.params.id;

    if (!bookingId) {
        throw new BadRequestError('BookingId is required.');
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
        throw new NotFoundError('Booking not found');
    }

    if (!booking.cashPending) {
        throw new BadRequestError('No cash pending to settle - this booking is already cleared');
    }

    booking.cashPending = false;
    booking.partialPayment = false;
    booking.discountAmount = booking.totalAmount - (booking.partialAmount || 0);
    booking.totalAmount -= booking.discountAmount;

    await booking.save()

    return res.status(StatusCodes.CREATED).json({
        success: true,
        data: booking,
        message: "Booking discount created successfully"
    });
})