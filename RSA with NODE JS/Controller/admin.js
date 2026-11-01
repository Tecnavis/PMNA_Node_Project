const Admin = require('../Model/admin'); // Adjust the path as needed
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();


exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Only the very first admin can be created without logging in.
    // After that, a logged-in admin must create new admins.
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      const header = req.header('Authorization');
      let caller = null;
      try {
        caller = header ? jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET) : null;
      } catch (e) { caller = null; }
      const role = caller?.user?.role || caller?.role;
      if (role !== 'Admin') {
        return res.status(403).json({ message: "Only a logged-in admin can create another admin" });
      }
    }
    if (!email || !password || String(password).length < 8) {
      return res.status(400).json({ message: "Email and a password of at least 8 characters are required" });
    }

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

const issueAdminToken = async (admin, email) => {
  // Admin-website sessions expire (WEB_TOKEN_EXPIRES, default 7 days). Older tokens without expiry keep working.
  const token = jwt.sign({ id: admin._id, user: { name: `${email}`, role: 'Admin' } }, process.env.JWT_SECRET, { expiresIn: process.env.WEB_TOKEN_EXPIRES || '7d' });
  admin.tokens = token;
  await admin.save();
  return token;
};

exports.loginAdmin = async (req, res) => {
  const { recordLogin } = require('../services/audit');
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: String(email || '').trim() });

    if (!admin) {
      console.log('No admin found');
      recordLogin(req, { kind: 'admin', login: email, success: false, reason: 'unknown-user' });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      console.log('Password mismatch');
      recordLogin(req, { kind: 'admin', userId: String(admin._id), name: admin.email, login: email, success: false, reason: 'wrong-password' });
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Two-step login (only when TWO_STEP_LOGIN=on): send a code instead of the token
    const twoStep = require('../services/twoStep');
    if (twoStep.required('admin')) {
      const r = await twoStep.start({ kind: 'admin', id: admin._id });
      recordLogin(req, { kind: 'admin', userId: String(admin._id), name: admin.email, login: email, success: false, reason: r.error ? 'otp-not-sent' : 'otp-sent' });
      if (r.error) return res.status(503).json({ message: r.error });
      return res.status(200).json({ otpRequired: true, challenge: r.challenge, phoneHint: r.phoneHint, channel: r.channel, message: `Enter the code sent to ${r.phoneHint}` });
    }

    const token = await issueAdminToken(admin, email);
    recordLogin(req, { kind: 'admin', userId: String(admin._id), name: admin.email, login: email, success: true, reason: 'ok' });
    res.status(200).json({ token, message: "Admin logged in successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

/** Second step of the admin login: { challenge, otp } → token */
exports.verifyAdminLogin = async (req, res) => {
  const { recordLogin } = require('../services/audit');
  try {
    const r = await require('../services/twoStep').verify(req.body?.challenge, req.body?.otp);
    if (r.error || r.kind !== 'admin') {
      recordLogin(req, { kind: 'admin', userId: r.id || '', success: false, reason: 'otp-wrong' });
      return res.status(400).json({ message: r.error || 'Invalid code' });
    }
    const admin = await Admin.findById(r.id);
    if (!admin) return res.status(400).json({ message: 'Invalid code' });
    const token = await issueAdminToken(admin, admin.email);
    recordLogin(req, { kind: 'admin', userId: String(admin._id), name: admin.email, login: admin.email, success: true, reason: 'ok-2fa' });
    res.status(200).json({ token, message: 'Admin logged in successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAdminQR = async (req, res) => {
  try {

    const adminId = req.user?.id;
    const admin = await Admin.findById(adminId);
    const quImage = req.file

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    
    if(req.user.role === 'admin'){
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!quImage) {
      return res.status(400).json({ message: "QR image is required" });
    }

    admin.qrImage = {
      url: quImage.path,
      uploadedAt: new Date()
    };

    await admin.save();

    return res.status(200).json({
      message: "Admin QR updated successfully",
      qrImage: admin.qrImage
    });

  } catch (error) {
    console.error("updateAdminQR error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminQR = async (req, res) => {
  try {
    const admin = await Admin.findOne().select("qrImage -_id");
    
    return res.status(200).json({
      qrImage: admin.qrImage?.url || null,
    });

  } catch (error) {
    console.error("getAdminQR error:", error);
    res.status(500).json({ message: error.message });
  }
};
