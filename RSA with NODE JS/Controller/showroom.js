const Showroom = require('../Model/showroom');
const ShowroomStaff = require('../Model/showroomStaff');
const bcrypt = require('bcrypt');
const { generateShowRoomLink } = require('../utils/generateLink');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { default: mongoose } = require('mongoose');

// Create a showroom
exports.createShowroom = async (req, res) => {
  try {
    const {
      name,
      showroomId,
      description,
      location,
      latitudeAndLongitude,
      username,
      password,
      helpline,
      phone,
      mobile,
      state,
      district,
      services, // May be undefined or missing
    } = req.body;

    // Parse services if it's a string; otherwise, default to an empty object
    let parsedServices = {};
    if (services) {
      if (typeof services === 'string') {
        try {
          parsedServices = JSON.parse(services);
        } catch (parseError) {
          return res.status(400).json({ message: 'Invalid services format. Must be a JSON string.' });
        }
      } else if (typeof services === 'object') {
        parsedServices = services;
      }
    }

    const imagePath = req.file ? req.file.filename : null;

    const showroomLink = generateShowRoomLink({
      id: showroomId,
      name,
      location,
      image: imagePath,
      helpline,
      phone,
      state,
      district
    })

    const showroom = new Showroom({
      name,
      showroomId,
      description,
      location,
      latitudeAndLongitude,
      username,
      password,
      helpline,
      phone,
      mobile,
      state,
      district,
      showroomLink,
      image: imagePath,
      services: {
        serviceCenter: {
          selected: parsedServices.serviceCenter?.selected || false,
          amount: parsedServices.serviceCenter?.amount || null,
        },
        bodyShop: {
          selected: parsedServices.bodyShop?.selected || false,
          amount: parsedServices.bodyShop?.amount || null,
        },
        showroom: {
          selected: parsedServices.showroom?.selected || false,
        },
      },
    });

    const savedShowroom = await showroom.save();
    res.status(201).json(savedShowroom);
  } catch (error) {
    console.error('Error creating showroom:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all showrooms
exports.getShowrooms = async (req, res) => {
  try {
    const showrooms = await Showroom.find();
    res.json(showrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get showroom by id 
exports.getShowroomById = async (req, res) => {
  try {
    const showroom = await Showroom.findById(req.params.id);
    if (!showroom) return res.status(404).json({ message: 'showroom not found' });
    res.status(200).json(showroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Filtered get showrooms endpoint
exports.filterGetShowrooms = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    if (search) {
      // Case-insensitive search on name, showroomId, or location
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { showroomId: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const showrooms = await Showroom.find(filter);
    res.json(showrooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update a showroom
exports.updateShowroom = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      showroomId,
      description,
      location,
      latitudeAndLongitude,
      username,
      password,
      helpline,
      phone,
      mobile,
      state,
      district,
    } = req.body;

    // Parse services if it's a string
    let services = req.body.services;
    if (typeof services === 'string') {
      services = JSON.parse(services);
    }

    const imagePath = req.file ? req.file.filename : null;

    const showroomLink = generateShowRoomLink({
      id: showroomId,
      name,
      location,
      image: imagePath,
      helpline,
      phone,
      state,
      district
    })

    const updatedFields = {
      name,
      showroomId,
      description,
      location,
      latitudeAndLongitude,
      username,
      phone,
      image: imagePath,
      mobile,
      state,
      district,
      helpline,
      password,
      showroomLink,
      services: {
        serviceCenter: {
          selected: services.serviceCenter.selected,
          amount: services.serviceCenter.amount || null,
        },
        bodyShop: {
          selected: services.bodyShop.selected,
          amount: services.bodyShop.amount || null,
        },
        showroom: {
          selected: services.showroom.selected,
        },
      },
    };

    const updatedShowroom = await Showroom.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!updatedShowroom) {
      return res.status(404).json({ message: 'Showroom not found' });
    }

    res.json(updatedShowroom);
  } catch (error) {
    console.error('Error updating showroom:', error);
    res.status(500).json({ message: error.message });
  }
};


// Delete a showroom
exports.deleteShowroom = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedShowroom = await Showroom.findByIdAndDelete(id);
    if (!deletedShowroom) {
      return res.status(404).json({ message: 'Showroom not found' });
    }
    res.json({ message: 'Showroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Showroom Staff
exports.getAllShowroomStaff = async (req, res) => {
  try {
    // Fetch all showroom staff from the database
    const showroomStaff = await ShowroomStaff.find().populate('showroomId'); // Populating showroom details
    console.log(showroomStaff, "showroom staff herer")
    return res.status(200).json({
      success: true,
      message: "Showroom staff retrieved successfully.",
      data: showroomStaff
    });

  } catch (error) {
    console.error("Error fetching showroom staff:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve showroom staff.",
      error: error.message
    });
  }
};

// Get All Showroom Staff
exports.getShowroomStaffs = async (req, res) => {
  const { id } = req.params
  try {
    const pipline = [
      {
        $match: { _id: new mongoose.Types.ObjectId(id) }
      },
      {
        $lookup: {
          from: 'showroomstaffs',
          localField: '_id',
          foreignField: 'showroomId',
          as: 'showroomStaff'
        }
      }
    ]

    const showroomStaff = await Showroom.aggregate(pipline)

    return res.status(200).json({
      success: true,
      message: "Showroom staff retrieved successfully.",
      data: showroomStaff[0].showroomStaff,
      showroomName: showroomStaff[0].name || ""
    });

  } catch (error) {
    console.error("Error fetching showroom staff:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve showroom staff.",
      error: error.message
    });
  }
};

// send otp for staff 
exports.sendOtpForShowroomStaff = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    console.log(req.body)
    // Check if staff exists
    const showroomStaff = await ShowroomStaff.findOne({ phoneNumber });
    if (!showroomStaff) {
      return res.status(400).json({ message: "Invalid credentials", success: false });
    }

    // Generate JWT token
    // const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET);

    // generate OTP
    const otpRespose = await sendOtp('+91', phone)
    if (!otpRespose.success) {
      return res.status(400).json({
        success: false,
        message: otpRespose.message
      })
    }

    // Include role and name in the response
    res.status(200).json({
      // token,
      // role: "Staff",
      // name: staff.name,
      success: true,
      message: "OTP sended successfully"
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", success: false });
  }
};

// verify otp and login 
exports.verifyOTPAndLogin = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Check if staff exists
    const showroomStaff = await ShowroomStaff.findOne({ phoneNumber });
    if (!showroomStaff) {
      return res.status(400).json({ message: "Invalid credentials", success: false });
    }

    // Generate JWT token
    const token = jwt.sign({ id: staff._id }, process.env.JWT_SECRET);

    // generate OTP
    const otpRespose = await verifyOtp('+91', phoneNumber, otp)
    if (!otpRespose.success) {
      return res.status(400).json({
        success: false,
        message: otpRespose.message
      })
    }

    // Include role and name in the response
    res.status(200).json({
      token,
      role: "Staff",
      name: staff.name,
      success: true,
      message: "OTP sended successfully"
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", success: false });
  }
};

exports.shoromStaffSignup = async (req, res) => {
  try {
    const { name, phone: phoneNumber, whatsappNumber, designation, showroomId } = req.body;
    console.log("body", req.body)

    if (!name || !phoneNumber || !designation || !showroomId) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Check if user already exists
    const existingUser = await ShowroomStaff.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = new ShowroomStaff({
      name,
      phoneNumber,
      whatsappNumber,
      designation,
      showroomId
    });

    await newUser.save();

    return res.status(201).json({ message: "Signup successful", data: newUser });
  } catch (error) {
    console.error("Error in showroom staff signup:", error);

    // Handle specific errors
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
}

// Login showroom
exports.loginShowroom = async (req, res) => {
  try {
    const { username, password } = req.body;

    if ([username, password].some(field => !field?.trim())) {
      return res.status(400).json({ message: 'All fields are required!', success: false });
    }

    const isShowroomExist = await Showroom.findOne({
      username,
    })

    if (!isShowroomExist) {
      return res.status(404).json({ message: 'Showroom not found!', success: false });
    }

    if (password !== isShowroomExist.password) {
      return res.status(400).json({ message: 'Invalid credentials, invalid password!', success: false });
    }

    return res.status(200).json({ message: 'Login sucessfull', success: true, data: isShowroomExist });
  } catch (error) {
    console.error("Error in showroom login:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
};