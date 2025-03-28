// controllers/staffController.js
const Staff = require('../Model/staff');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ClientSession } = require('mongodb');

// Create Staff
exports.createStaff = async (req, res) => {
    try {
      const staffData = new Staff({
        name: req.body.name,
        email: req.body.email,
        address: req.body.address,
        phone: req.body.phone,
        userName: req.body.userName,
        password: req.body.password,
        image: req.file ? req.file.filename : null, // Store the image 
        role: req.body.role,
      });
  
      await staffData.save();
      res.status(201).json({ message: 'Staff created successfully!', data: staffData });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  };

// Read Staff (Get all staff)
exports.getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find().populate('role');
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Read Staff by ID
exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).populate('role');
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Filtered get staffs endpoint
exports.filterGetStaffs = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    
    if (search) {
      // Case-insensitive search on name, showroomId, or location
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } },
        ]
      };
    }
    
    const staffs = await Staff.find(filter);
    res.json(staffs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update Staff
exports.updateStaff = async (req, res) => {
  try {
    // Dynamically create the updatedData object
    const updatedData = {
      name: req.body.name,
      email: req.body.email,
      address: req.body.address,
      phone: req.body.phone,
      userName: req.body.userName,
      password: req.body.password,
      role: req.body.role,
    };

    // Add image to updatedData only if a new file is uploaded
    if (req.file) {
      updatedData.image = req.file.filename;
    }

    const staff = await Staff.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!staff) return res.status(404).json({ message: 'Staff not found' });

    res.status(200).json({ message: 'Staff updated successfully!', data: staff });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Delete Staff
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ message: 'Staff not found' });
    res.status(200).json({ message: 'Staff deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// log-in for staff 
exports.loginStaff = async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Check if staff exists
    const staff = await Staff.findOne({ userName });
    if (!staff) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Directly compare passwords (not recommended for production unless passwords are hashed)
    if (password !== staff.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET);

    // Include role and name in the response
    res.status(200).json({
      token,
      role: staff.role,
      name: staff.name,
      message: "Staff logged in successfully"
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};
