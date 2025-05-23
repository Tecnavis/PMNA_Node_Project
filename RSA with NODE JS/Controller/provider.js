const Provider = require('../Model/provider');
const Booking = require('../Model/booking');
const { sendOtp, verifyOtp } = require('../services/otpService');
const jwt = require('jsonwebtoken');
const { updateProviderFinancials } = require('../services/providerService');

// Create a new provider
exports.createProvider = async (req, res) => {
  try {
    const { name, companyName, baseLocation, idNumber, creditAmountLimit, phone, personalPhoneNumber, password, serviceDetails } = req.body;

    // Parse serviceDetails if it is a string
    const parsedServiceDetails = typeof serviceDetails === 'string' ? JSON.parse(serviceDetails) : serviceDetails;

    const serviceData = Array.isArray(parsedServiceDetails)
      ? parsedServiceDetails.map(s => ({
        serviceType: s.id, // Map 'id' to 'serviceType'
        basicAmount: s.basicAmount,
        kmForBasicAmount: s.kmForBasicAmount,
        overRideCharge: s.overRideCharge,
        vehicleNumber: s.vehicleNumber,
      }))
      : [];

    console.log('Transformed serviceData:', serviceData);

    const provider = new Provider({
      name,
      companyName,
      baseLocation,
      idNumber,
      creditAmountLimit,
      phone,
      personalPhoneNumber,
      password,
      image: req.file ? req.file.filename : null,
      serviceDetails: serviceData,
    });

    await provider.save();
    res.status(201).json(provider);
  } catch (error) {
    console.error('Error saving provider:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get all providers
exports.getAllProviders = async (req, res) => {
  try {
    const providers = await Provider.find().populate('baseLocation serviceDetails.serviceType').lean();

    const providerIds = providers.map(provider => provider._id);

    await Promise.all(
      providers.map(provider =>
        updateProviderFinancials(
          provider._id,
          providers.filter(d => String(d._id) === String(provider._id))[0].advance || 0
        )
      )
    );

    // Fetch the last booking status for each driver
    const lastBookings = await Booking.aggregate([
      { $match: { provider: { $in: providerIds } } },
      { $sort: { updatedAt: -1 } }, // Sort by latest updatedAt
      {
        $group: {
          _id: "$provider",
          status: { $first: "$status" }, // Get the latest status
        }
      }
    ]);

    // Convert to lookup maps for fast access
    const statusMap = new Map(lastBookings.map(booking => [booking._id.toString(), booking.status]));

    // Merge data into driver objects
    const updatedProvider = providers.map(provider => ({
      ...provider,
      status: statusMap.get(provider._id.toString()) || "Unknown"
    }));

    res.status(200).json(updatedProvider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a provider by ID
exports.getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).populate('baseLocation serviceDetails.serviceType');
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    updateProviderFinancials(
      provider._id,
      provider.advance,
    )

    res.status(200).json(provider);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a provider by ID
exports.updateProvider = async (req, res) => {
  try {
    const { name, companyName, baseLocation, idNumber, creditAmountLimit, phone, personalPhoneNumber, password, serviceDetails, currentLocation, fcmToken } = req.body;

    const provider = await Provider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    // Parse serviceDetails if it is a string
    const parsedServiceDetails = typeof serviceDetails === 'string' ? JSON.parse(serviceDetails) : serviceDetails;

    const serviceData = Array.isArray(parsedServiceDetails)
      ? parsedServiceDetails.map(s => ({
        serviceType: s.id || s.serviceType, // Handle both creation and update cases
        basicAmount: s.basicAmount,
        kmForBasicAmount: s.kmForBasicAmount,
        overRideCharge: s.overRideCharge,
        vehicleNumber: s.vehicleNumber,
      }))
      : provider.serviceDetails; // Retain the existing serviceDetails if none provided

    // Update provider fields
    provider.name = name || provider.name;
    provider.companyName = companyName || provider.companyName;
    provider.baseLocation = baseLocation || provider.baseLocation;
    provider.idNumber = idNumber || provider.idNumber;
    provider.creditAmountLimit = creditAmountLimit || provider.creditAmountLimit;
    provider.phone = phone || provider.phone;
    provider.personalPhoneNumber = personalPhoneNumber || provider.personalPhoneNumber;
    provider.password = password || provider.password;
    provider.image = req.file ? req.file.filename : provider.image;
    provider.serviceDetails = serviceData;
    provider.currentLocation = currentLocation || provider.currentLocation
    provider.fcmToken = fcmToken || provider.fcmToken;

    await provider.save();
    res.status(200).json(provider);
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete a provider by ID
exports.deleteProvider = async (req, res) => {
  try {
    const provider = await Provider.findByIdAndDelete(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.status(204).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Provider Log-in
exports.loginProvider = async (req, res) => {
  try {
    const { phone } = req.body;

    // Check if driver exists
    const provider = await Provider.findOne({ phone });
    if (!provider) {
      return res.status(400).json({ message: "Invalid Phone Number" });
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
    const token = jwt.sign({ id: provider._id, role: "Provider", name: `${provider.name}` }, process.env.JWT_SECRET);
    provider.tokens = token; // If you want to store the token, you can update the provider schema to include a `tokens` field
    await provider.save();

    res.status(200).json({
      message: "OTP sended successfully",
      success: true
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

//verify otp
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Check if driver exists
    const provider = await Provider.findOne({ phone });
    if (!provider) {
      return res.status(400).json({ message: "Invalid credentials" });
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
    const token = jwt.sign({ id: provider._id }, process.env.JWT_SECRET);

    res.status(200).json({
      token,
      providerId: provider._id,
      message: "login successfully",
      success: true
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// fetching providers by query 

exports.filtergetProviders = async (req, res) => {
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

    const providers = await Provider.find(filter).populate('baseLocation serviceDetails.serviceType');

    await Promise.all(
      providers.map(provider =>
        updateProviderFinancials(
          provider._id,
          providers.filter(d => String(d._id) === String(provider._id))[0].advance || 0
        )
      )
    );

    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProvidersForDropdown = async (req, res) => {
  try {

    const providers = await Provider.find().select('_id name').lean();

    const dropdownData = providers.map(driver => ({
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
      message: 'Failed to fetch Provider dropdown data'
    });
  }
};