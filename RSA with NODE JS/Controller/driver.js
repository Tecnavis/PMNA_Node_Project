// controllers/driver.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Driver = require('../Model/driver');
const Leaves = require('../Model/leaves');
const Booking = require('../Model/booking');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { updateDriverFinancials } = require('../services/driverService');


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

    await Promise.all(
      drivers.map(driver =>
        updateDriverFinancials(
          driver._id,
          drivers.filter(d => String(d._id) === String(driver._id))[0].advance || 0
        )
      )
    );

    res.json(drivers);
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
    const token = jwt.sign({ id: driver._id }, process.env.JWT_SECRET);

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