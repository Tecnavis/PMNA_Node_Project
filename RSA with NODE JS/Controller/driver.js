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
    const { search } = req.query; // Get search query from request

    let filter = {};
    if (search) {
      // Case-insensitive search for both name and idNumber
      filter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { idNumber: { $regex: search, $options: "i" } }
        ]
      };
    }

    const drivers = await Driver.find(filter).populate('vehicle.serviceType');
    
    // Update all drivers' financials and get the updated documents
    const updatedDrivers = await Promise.all(
      drivers.map(async (driver) => {
        const advance = driver.advance || 0;
        // Wait for each update to complete and return the updated driver
        return await updateDriverFinancials(driver._id, advance);
      })
    );

    // Only send response after all updates are complete
    res.json(updatedDrivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
exports.completeSettlement = async (req, res) => {
    try {
        // Verify all required models are available
        if (!Driver || !Expense || !Advance) {
            throw new Error('Database models not properly initialized');
        }

        const { driverId } = req.params;
        const { advanceAmount = 0 } = req.body;

        // Verify driver exists
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ 
                success: false,
                message: "Driver not found"
            });
        }

        // Check for pending expenses
        let pendingExpenses = [];
        let totalPending = 0;
        
        try {
            pendingExpenses = await Expense.find({
                driver: driverId,
                $or: [
                    { approve: { $exists: false } },
                    { approve: false }
                ]
            });
            totalPending = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        } catch (expenseError) {
            console.error('Error fetching expenses:', expenseError);
            throw new Error('Failed to process expenses');
        }

        // Prepare update data
        const updateData = {
            previousSettlementCompletedDate: driver.settlementCompletedDate,
            settlementCompletedDate: new Date(),
            settlement: true
        };

        // Handle pending expenses if any
        if (pendingExpenses.length > 0) {
            if (driver.cashInHand < totalPending) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient funds. Need $${totalPending - driver.cashInHand} more`,
                    requiredAmount: totalPending - driver.cashInHand
                });
            }

            await Expense.updateMany(
                { _id: { $in: pendingExpenses.map(e => e._id) } },
                { 
                    $set: { 
                        approve: true,
                        approvedDate: new Date(),
                        status: 'approved'
                    }
                }
            );

            updateData.$inc = {
                cashInHand: -totalPending,
                totalExpense: totalPending
            };
        }

        // Handle advance if provided
        if (advanceAmount > 0) {
            await Advance.create({
                driver: driverId,
                addedAdvance: advanceAmount,
                advance: advanceAmount,
                type: 'settlement',
                userModel: 'Driver',
                remark: 'Advance for expense settlement'
            });

            updateData.$inc = updateData.$inc || {};
            updateData.$inc.cashInHand = (updateData.$inc.cashInHand || 0) + advanceAmount;
        }

        // Update driver
        const updatedDriver = await Driver.findByIdAndUpdate(
            driverId,
            updateData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Settlement completed successfully",
            driver: updatedDriver
        });

    } catch (error) {
        console.error('Settlement error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error completing settlement',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};