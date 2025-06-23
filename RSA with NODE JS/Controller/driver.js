// controllers/driver.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../Model/driver');
const Leaves = require('../Model/leaves');
const Booking = require('../Model/booking');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { updateDriverFinancials } = require('../services/driverService');
const Expense = require('../Model/expense'); // Adjust path as needed
const Advance = require('../Model/advance'); // If you use advances
const { default: mongoose } = require('mongoose');


exports.createDriver = async (req, res) => {
  try {
    const { name, idNumber, phone, personalPhoneNumber, password, vehicle } = req.body;

    const parsedVehicleDetails = typeof vehicle === 'string' ? JSON.parse(vehicle) : vehicle

    const nameIsExist = await Driver.findOne({ $or: [{ phone }, { personalPhoneNumber }] });

    if (nameIsExist) {
      return res.status(400).json({
        message: "Driver already exists in the database.",
        success: false,
      });
    }

    const vehicleData = Array.isArray(parsedVehicleDetails)
      ? parsedVehicleDetails.map(v => ({
        serviceType: v.id, // Map 'id' to 'serviceType'
        basicAmount: v.basicAmount,
        kmForBasicAmount: v.kmForBasicAmount,
        overRideCharge: v.overRideCharge,
        vehicleNumber: v.vehicleNumber,
      }))
      : [];

    const driver = new Driver({
      name,
      idNumber,
      phone,
      personalPhoneNumber,
      password,
      image: req.file ? req.file.filename : null,
      vehicle: vehicleData,
    });

    await driver.save();
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().populate('vehicle.serviceType').lean();

    const driverIds = drivers.map(driver => driver._id);

    await Promise.all(
      drivers.map(driver =>
        updateDriverFinancials(
          driver._id,
          drivers.filter(d => String(d._id) === String(driver._id))[0].advance || 0
        )
      )
    );

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Fetch leaves for today
    const leaves = await Leaves.find({
      driver: { $in: driverIds },
      leaveDate: { $gte: startOfDay, $lt: endOfDay }
    }).lean();

    // Fetch the last booking status for each driver
    const lastBookings = await Booking.aggregate([
      { $match: { driver: { $in: driverIds } } },
      { $sort: { updatedAt: -1 } }, // Sort by latest updatedAt
      {
        $group: {
          _id: "$driver",
          status: { $first: "$status" }, // Get the latest status
        }
      }
    ]);

    // Convert to lookup maps for fast access
    const leaveSet = new Set(leaves.map(leave => leave.driver.toString()));
    const statusMap = new Map(lastBookings.map(booking => [booking._id.toString(), booking.status]));

    // Merge data into driver objects
    const updatedDrivers = drivers.map(driver => ({
      ...driver,
      isLeave: leaveSet.has(driver._id.toString()),
      status: statusMap.get(driver._id.toString()) || "Unknown"
    }));

    res.json(updatedDrivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};


exports.filtergetDrivers = async (req, res) => {
  try {
    const { search } = req.query;

    // Validate search query exists but might be empty
    const filter = search ? {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { idNumber: { $regex: search, $options: "i" } },
        // Add more fields if needed
      ]
    } : {};

    // Find drivers with optional filter
    const drivers = await Driver.find(filter)
      .populate('vehicle.serviceType')
      .lean(); // Use lean() for better performance

    // Process drivers in parallel
    const updatedDrivers = await Promise.all(
      drivers.map(async (driver) => {
        try {
          const advance = driver.advance || 0;
          return await updateDriverFinancials(driver._id, advance);
        } catch (error) {
          console.error(`Error updating driver ${driver._id}:`, error);
          return driver; // Return original driver if update fails
        }
      })
    );

    res.json(updatedDrivers);
  } catch (error) {
    console.error('Error in filtergetDrivers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch drivers',
      details: error.message 
    });
  }
};


exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('vehicle.serviceType');

    // calulating net total amount in hand ans totla salary
    updateDriverFinancials(driver._id, driver.advance)

    await driver.save()

    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { name, idNumber, phone, personalPhoneNumber, password, vehicle, currentLocation, fcmToken } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Parse vehicle if it's a string
    const parsedVehicle = typeof vehicle === 'string' ? JSON.parse(vehicle) : vehicle;

    const vehicleData = Array.isArray(parsedVehicle)
      ? parsedVehicle.map(v => ({
        serviceType: v.id || v.serviceType, // Handle both creation and update cases
        basicAmount: v.basicAmount,
        kmForBasicAmount: v.kmForBasicAmount,
        overRideCharge: v.overRideCharge,
        vehicleNumber: v.vehicleNumber,
      }))
      : driver.vehicle; // Retain the existing vehicle data if none provided

    // Update driver fields
    driver.name = name || driver.name;
    driver.idNumber = idNumber || driver.idNumber;
    driver.phone = phone || driver.phone;
    driver.personalPhoneNumber = personalPhoneNumber || driver.personalPhoneNumber;
    driver.password = password || driver.password;
    driver.image = req.file ? req.file.filename : driver.image;
    driver.vehicle = vehicleData;
    driver.currentLocation = currentLocation || driver.currentLocation;
    driver.fcmToken = fcmToken || driver.fcmToken;

    await driver.save();
    res.status(200).json(driver);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json({ message: 'Driver deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Driver log-in 

exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Check if driver exists
    const driver = await Driver.findOne({ phone });
    if (!driver) {
      return res.status(400).json({ message: "Invalid credentials", success: false });
    }

    // generate OTP
    const otpRespose = await sendOtp('+91', phone)
    if (!otpRespose.success) {
      return res.status(400).json({
        success: false,
        message: otpRespose.message
      })
    }
    // Generate JWT token
    const token = jwt.sign({ id: driver._id }, process.env.JWT_SECRET);
    driver.tokens = token; // If you want to store the token, you can update the driver schema to include a `tokens` field
    await driver.save();

    res.status(200).json({
      message: "OTP sended successfully",
      success: true
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", success: false, });
  }
};
//verify otp
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Check if driver exists
    const driver = await Driver.findOne({ phone });
    if (!driver) {
      return res.status(400).json({ message: "Invalid credentials", success: false, });
    }

    // Verify OTP
    const otpRespose = await verifyOtp('+91', phone, otp)
    if (!otpRespose.success) {
      return res.status(400).json({
        success: false,
        message: otpRespose.message
      })
    }

    // Generate JWT token
    const token = jwt.sign({ id: driver._id, role: 'Driver', name: `${driver.name}` }, process.env.JWT_SECRET);

    res.status(200).json({
      token,
      driverId: driver._id,
      message: "login successfully",
      success: true
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", success: false, });
  }
}

exports.getDriversForDropdown = async (req, res) => {
  try {

    const drivers = await Driver.find().select('_id name').lean();

    const dropdownData = drivers.map(driver => ({
      _id: driver._id,
      label: driver.name,
    }));

    res.json({
      success: true,
      data: dropdownData
    });
  } catch (error) {
    console.error('Driver dropdown fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch driver dropdown data'
    });
  }
};
// --------------------------------
exports.completeSettlement = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.startTransaction();

        const { driverId } = req.params;
        const { isFullSettlement = true } = req.body;

        // 1. Verify driver exists
        const driver = await Driver.findById(driverId).session(session);
        if (!driver) {
            await session.abortTransaction();
            return res.status(404).json({ 
                success: false,
                message: "Driver not found"
            });
        }

        // 2. Update all relevant bookings
        const bookingsToUpdate = await Booking.find({
            driver: driverId,
            status: "Order Completed",
            cashPending: false,
            $or: [
                { receivedUser: { $ne: 'Staff' } },
                { 
                    receivedUser: 'Staff',
                    partialReceivedAmountStaff: true
                }
            ],
            $expr: { $lt: ["$receivedAmount", "$totalAmount"] }
        }).session(session);

        // Mark all bookings as fully received
        if (bookingsToUpdate.length > 0) {
            const bulkOps = bookingsToUpdate.map(booking => ({
                updateOne: {
                    filter: { _id: booking._id },
                    update: {
                        $set: {
                            receivedAmount: booking.totalAmount,
                            ...(booking.receivedUser === 'Staff' && {
                                receivedAmountStaff: booking.totalAmount,
                                partialReceivedAmountStaff: false
                            })
                        }
                    }
                }
            }));
            await Booking.bulkWrite(bulkOps, { session });
        }

        // 3. Get verified bookings and calculate total driver salary
        const verifiedBookings = await Booking.find({
            driver: driverId,
            verified: true,
            status: "Order Completed",
            driverSalary: { $exists: true, $gt: 0 }
        }).session(session);

        // Calculate total transferable salary from bookings
        let totalTransferableSalary = 0;
        const bookingUpdates = [];

        verifiedBookings.forEach(booking => {
            const currentTransferred = booking.transferedSalary || 0;
            const balanceSalary = booking.driverSalary - currentTransferred;
            
            if (balanceSalary > 0) {
                totalTransferableSalary += balanceSalary;
                bookingUpdates.push({
                    updateOne: {
                        filter: { _id: booking._id },
                        update: {
                            $set: {
                                transferedSalary: booking.driverSalary // Mark as fully transferred
                            }
                        }
                    }
                });
            }
        });

        // Update bookings with their transferred amounts
        if (bookingUpdates.length > 0) {
            await Booking.bulkWrite(bookingUpdates, { session });
        }

        // 4. Update driver document
        const updateData = {
            $inc: {
                transferedSalary: totalTransferableSalary
            },
              $set: {
        driverSalary: 0,    // Reset current salary
        cashInHand: 0,      // Always reset cashInHand to 0
        advance: 0,         // Always reset advance to 0
        balanceAmount: 0    // Always reset balanceAmount to 0
    }
        };

      const onlyCashInHand = (driver.cashInHand > 0) && 
                      (driver.balanceAmount === 0 || driver.balanceAmount === null) && 
                      (totalTransferableSalary === 0);

if (onlyCashInHand) {
    // Special case: Only cashInHand needs settlement
    updateData.$set.advance = 0;  // Explicitly set advance to 0
}

        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            updateData,
            { session, new: true }
        ).lean();

        // 5. Handle pending expenses
        const pendingExpenses = await Expense.find({
            driver: driverId,
            $or: [
                { approve: { $exists: false } },
                { approve: false }
            ]
        }).session(session);

        if (pendingExpenses.length > 0) {
            await Expense.updateMany(
                { _id: { $in: pendingExpenses.map(e => e._id) } },
                { 
                    $set: { 
                        approve: true,
                        approvedDate: new Date(),
                        status: 'approved',
                        approvedBy: req.user._id
                    }
                },
                { session }
            );
        }

        // Commit the transaction
        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Full settlement completed successfully',
            data: {
                updatedBookings: bookingsToUpdate.length,
                approvedExpenses: pendingExpenses.length,
                transferredFromBookings: bookingUpdates.length,
                totalTransferredSalary: totalTransferableSalary,
                driver: {
                    transferedSalary: updatedDriver.transferedSalary,
                    driverSalary: updatedDriver.driverSalary
                }
            }
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing settlement',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        session.endSession();
    }
};