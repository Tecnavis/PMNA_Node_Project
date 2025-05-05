const Showroom = require('../Model/showroom');
const Booking = require('../Model/booking');
const ShowroomStaff = require('../Model/showroomStaff');
const bcrypt = require('bcrypt');
const { generateShowRoomLink } = require('../utils/generateLink');
const { sendOtp, verifyOtp } = require('../services/otpService');
const { default: mongoose } = require('mongoose');
const jwt = require('jsonwebtoken')

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
    const showrooms = await Showroom.find()
      .populate('showroomId')
      return res.status(200).json(showrooms);
  
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

// Get all showrooms
exports.getPaginatedShowrooms = async (req, res) => {
  try {

    let { search, page = 1, limit = 25 } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      const serachQuery = search.trim()
      const regex = new RegExp(serachQuery, 'i'); // case-insensitive search

      query.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { position: regex },
        { state: regex },
        { district: regex },
        { 'showroomId.name': regex }, // for populated fields
      ];
    }

    const totalCount = await Showroom.countDocuments(query);

    const showrooms = await Showroom.find(query)
      .populate('showroomId')
      .skip(skip)
      .limit(limit);
      return res.status(200).json({
        success: true,
        message: "Showroom retrieved successfully.",
        data: showrooms,
        page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      });
  
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

// Get  Staff
exports.getStaffProfile = async (req, res) => {
  try {
    const staffId = new mongoose.Types.ObjectId(req.user.id)
    const showroomStaff = await ShowroomStaff.findById(staffId).populate('showroomId'); // Populating showroom details

    return res.status(200).json({
      success: true,
      message: "Showroom staff retrieved successfully.",
      data: showroomStaff
    });

  } catch (error) {
    console.log("Error fetching showroom staff:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve showroom staff.",
      error: error.message
    });
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
// DELETE Showroom Staff by ID or phoneNumber
exports.deleteShowroomStaff = async (req, res) => {
  try {
    const { showroomId, staffId } = req.params;

    // Log the staffId to the console
    console.log(`Attempting to delete staff member with ID: ${staffId} from showroom with ID: ${showroomId}`);

    // Attempt to delete the staff member using the ID and showroomId
    const deletedStaff = await ShowroomStaff.findOneAndDelete({
      _id: staffId,
      showroomId: showroomId,  // Ensure that the staff is associated with the correct showroom
    });

    if (!deletedStaff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete staff member',
      error: error.message,
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
exports.staffLogin = async (req, res) => {
  try {
    const { phoneNumber, showroom } = req.body;

    const showroomId = new mongoose.Types.ObjectId(showroom)

    // Check if staff exists
    const showroomStaff = await ShowroomStaff.findOne({ phoneNumber });
    if (!showroomStaff) {
      return res.status(400).json({ message: "Invalid credentials", success: false });
    }

    if (!showroom) {
      return res.status(400).json({ message: "Showroom details is required", success: false });
    }

    const IsShowroomExist = await Showroom.findById(showroomId);

    if (!IsShowroomExist) {
      return res.status(404).json({ message: "Showroom not found", success: false });
    }

    // Generate JWT token
    const token = jwt.sign({ id: showroomStaff._id }, process.env.JWT_SECRET);

    // Include role and name in the response
    res.status(200).json({
      token,
      role: "Staff",
      name: showroomStaff.name,
      success: true,
      message: "Successfully logged"
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error", success: false });
  }
};

exports.showroomStaffSignup = async (req, res) => {
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
// Add new staff member
exports.addStaffMember = async (req, res) => {
  try {
    const { name, phoneNumber, whatsappNumber, designation, showroomId } = req.body;

    if (!name || !phoneNumber || !whatsappNumber || !designation || !showroomId) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const newStaff = new ShowroomStaff({
      name,
      phoneNumber: phoneNumber,
      whatsappNumber,
      designation,
      showroomId,
    });

    await newStaff.save();

    res.status(201).json({ success: true, data: newStaff, message: 'Staff added successfully' });
  } catch (error) {
    console.error('Error adding staff:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
// PUT /showroom/update-staff/:staffId
exports.updateStaffMember = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, phoneNumber, whatsappNumber, designation } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !whatsappNumber || !designation) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Find and update the staff member
    const updatedStaff = await ShowroomStaff.findByIdAndUpdate(
      staffId,
      { name, phoneNumber, whatsappNumber, designation },
      { new: true, runValidators: true }
    );

    if (!updatedStaff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({ success: true, data: updatedStaff, message: 'Staff updated successfully' });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

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

    const token = jwt.sign({ id: isShowroomExist._id, role: "Showroom" }, process.env.JWT_SECRET);

    return res.status(200).json({ message: 'Login sucessfull', success: true, data: isShowroomExist, token });
  } catch (error) {
    console.error("Error in showroom login:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
};

exports.showroomDashBoardReport = async (req, res) => {
  const { month, year, serviceCategory, showroomId } = req.query;

  try {
    // Validate showroomId first
    if (!showroomId) {
      return res.status(400).json({
        success: false,
        message: "Showroom ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(showroomId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Showroom ID format"
      });
    }

    const showroomObjectId = new mongoose.Types.ObjectId(showroomId);

    // Initialize query object with showroom filter
    let query = {
      showroom: showroomObjectId
    };

    // Date filtering logic
    if (year) {
      const yearNum = parseInt(year);
      if (month) {
        // Specific month and year provided
        const monthNum = parseInt(month);
        const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
        const endDate = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
        query.createdAt = { $gte: startDate, $lte: endDate };
      } else {
        // Only year provided - get whole year
        const startDate = new Date(Date.UTC(yearNum, 0, 1));
        const endDate = new Date(Date.UTC(yearNum, 11, 31, 23, 59, 59, 999));
        query.createdAt = { $gte: startDate, $lte: endDate };
      }
    }

    // Service category filter
    if (serviceCategory) {
      query.serviceCategory = serviceCategory;
    }

    // Get raw booking data
    const bookings = await Booking.find(query)
      .sort({ createdAt: 1 })
      .lean();

    // Aggregation pipelines
    const monthlyTotalsPipeline = [
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          monthName: { $first: { $dateToString: { format: "%B", date: "$createdAt" } } },
          monthlyTotal: { $sum: "$totalAmount" },
          monthlyBalance: { $sum: "$receivedAmount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];

    const overallTotalsPipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          wholeTotal: { $sum: "$totalAmount" },
          wholeBalance: { $sum: "$receivedAmount" },
          totalCount: { $sum: 1 }
        }
      }
    ];

    const lifetimeTotalsPipeline = [
      { $match: { showroom: showroomObjectId, serviceCategory } },
      {
        $group: {
          _id: null,
          lifetimeTotal: { $sum: "$totalAmount" },
          lifetimeBalance: { $sum: "$receivedAmount" },
          lifetimeCount: { $sum: 1 }
        }
      }
    ];

    // Execute all aggregations in parallel
    const [monthlyTotals, overallTotals, lifetimeTotals] = await Promise.all([
      Booking.aggregate(monthlyTotalsPipeline),
      Booking.aggregate(overallTotalsPipeline),
      Booking.aggregate(lifetimeTotalsPipeline)
    ]);

    return res.status(200).json({
      success: true,
      filter: {
        showroom: showroomId,
        serviceCategory: serviceCategory || 'All',
        timePeriod: month
          ? `${month}/${year}`
          : year
            ? `Year ${year}`
            : 'All time'
      },
      bookings,
      monthlyTotals,
      overallTotals: overallTotals[0] || { wholeTotal: 0, wholeBalance: 0, totalCount: 0 },
      lifetimeTotals: lifetimeTotals[0] || { lifetimeTotal: 0, lifetimeBalance: 0, lifetimeCount: 0 }
    });

  } catch (error) {
    console.error("Error in showroom dashboard report:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format provided"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later."
    });
  }
};

// get showroomStaff by id 
exports.getShowroomStaffById = async (req, res) => {
  try {
    const showroom = await ShowroomStaff.findById(req.params.id);
    if (!showroom) return res.status(404).json({ message: 'showroom not found' });
    res.status(200).json(showroom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};