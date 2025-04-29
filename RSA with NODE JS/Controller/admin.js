const Admin = require('../Model/admin'); // Adjust the path as needed
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const logger = require('../utils/logger');

exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    // Create a new admin
    const newAdmin = new Admin({ email, password });
    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body, 'Request body');

    const admin = await Admin.findOne({ email: email.trim() });
    console.log(admin, 'Admin found in the database');

    if (!admin) {
      console.log('No admin found');
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    console.log(isMatch, 'Password comparison result');

    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, user: { name: `Admin-${email}` } }, process.env.JWT_SECRET);
    console.log(token, 'Generated JWT token');

    admin.tokens = token;
    await admin.save();


    // Log the action in a structured format
    // logger.info('Admin Logged', {
    //   user: 'Admin',
    //   action: 'Admin loging',
    //   data: { email }
    // });


    res.status(200).json({ token, message: "Admin logged in successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};
