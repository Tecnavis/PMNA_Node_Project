// controllers/driver.controller.js
const Driver = require('../Model/driver');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.createDriver = async (req, res) => {
  try {
    const { name, idNumber, phone, personalPhoneNumber, password, vehicle } = req.body;

const parsedVehicleDetails = typeof vehicle === 'string' ? JSON.parse(vehicle) : vehicle

  


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
    const drivers = await Driver.find().populate('vehicle.serviceType');
    res.json(drivers);
  } catch (error) {
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
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('vehicle.serviceType');
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDriver = async (req, res) => {
  try {
    const { name, idNumber, phone, personalPhoneNumber, password, vehicle } = req.body;

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

exports.loginDriver = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Check if driver exists
    const driver = await Driver.findOne({ phone });
    if (!driver) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: driver._id }, process.env.JWT_SECRET);
    driver.tokens = token; // If you want to store the token, you can update the driver schema to include a `tokens` field
    await driver.save();

    res.status(200).json({ token, message: "Driver logged in successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

