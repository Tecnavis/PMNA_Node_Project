const Provider = require('../Model/provider');
const mongoose = require('mongoose');
const Booking = require('../Model/booking');
const { sendOtp, verifyOtp } = require('../services/otpService');
const jwt = require('jsonwebtoken');
const { updateProviderFinancials } = require('../services/providerService');
const ReceivedDetails = require('../Model/ReceivedDetails'); // Make sure you have this model
const SettlementTransaction = require('../Model/settlementTransaction'); // Create this if needed
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
    const { serviceTypeId } = req.query; // Add this
    
    let query = {};
    if (serviceTypeId) {
      query = {
        'serviceDetails.serviceType': serviceTypeId
      };
    }

    const providers = await Provider.find(query).populate('baseLocation serviceDetails.serviceType').lean();

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
exports.getAllProvidersBooking = async (req, res) => {
  try {
    const { serviceTypeId } = req.query; // Add this
    
    let query = {};
    if (serviceTypeId) {
      query = {
        'serviceDetails.serviceType': serviceTypeId
      };
    }

    const providers = await Provider.find(query).populate('baseLocation serviceDetails.serviceType').lean();

    const providerIds = providers.map(provider => provider._id);


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

exports.completeProviderSettlement = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { isFullSettlement = true } = req.body;

        // 1. Validate inputs
        if (!mongoose.Types.ObjectId.isValid(providerId)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid provider ID"
            });
        }

        // 2. Verify provider exists
        const provider = await Provider.findById(providerId);
        if (!provider) {
            return res.status(404).json({ 
                success: false,
                message: "Provider not found"
            });
        }

        // Store current date for settlement
        const currentSettlementDate = new Date();
        const settlementDatesUpdate = {
            previousSettlementCompletedDate: provider.settlementCompletedDate || null,
            settlementCompletedDate: currentSettlementDate
        };

        // 3. Update bookings with pending payments related to this provider
        // Assuming providers can have bookings
        const bookingsToUpdate = await Booking.find({
            provider: providerId,
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
        });

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
            await Booking.bulkWrite(bulkOps);
        }

        // For providers, we should calculate their share/commission
        const verifiedBookings = await Booking.find({
            provider: providerId,
            verified: true,
            status: "Order Completed",
            $or: [
                { driverSalary: { $exists: true, $gt: 0 } }
            ]
        });

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
                                       transferedSalary: booking.driverSalary
                                   }
                               }
                           }
                       });
                   }
               });
       
                 if (bookingUpdates.length > 0) {
                   await Booking.bulkWrite(bookingUpdates);
               }

        

        // 5. Calculate remaining cash and handle advance
        const remainingAmount = Math.max(0, provider.cashInHand - totalTransferableSalary);
        let advanceDeduction = 0;
        let newAdvanceBalance = provider.advance || 0;

        if (remainingAmount > 0 && provider.advance > 0) {
            advanceDeduction = Math.min(remainingAmount, provider.advance);
            newAdvanceBalance = provider.advance - advanceDeduction;
        }

        // 6. Create received details record (optional)
        if (advanceDeduction > 0) {
            await ReceivedDetails.create({
                remark: 'Provider settlement - Advance deduction',
                balance: 0,
                fileNumber: 'Provider Settlement',
                currentNetAmount: 0,
                amount: `Advance: ${provider.advance || 0}`,
                provider: providerId,
                receivedAmount: advanceDeduction,
                totalAmount: remainingAmount,
                receivedUser: req.user?.role || 'Admin',
                receivedUserId: req.user?._id,
            });
        }

        // 7. Update provider document
        const updateData = {
            $inc: {
                transferedSalary: totalTransferableSalary // Add this to provider schema
            },
            $set: {
                cashInHand: 0,
                balanceAmount: 0,
                advance: newAdvanceBalance,
                settlement: true,
                isFullSettlement: isFullSettlement,
                ...settlementDatesUpdate
            }
        };


        const updatedProvider = await Provider.findByIdAndUpdate(
            providerId,
            updateData,
            { new: true }
        ).lean();

        // 8. Create settlement transaction record
        // In your provider controller - update the settlement function

// 8. Create settlement transaction record
const settlementTransactionData = {
  provider: providerId,
  userType: 'provider',
  settlementDate: currentSettlementDate,
  totalSalary: totalTransferableSalary,
  cashInHand: provider.cashInHand,
  balanceAmount: provider.balanceAmount,
  advance: provider.advance,
  cashCollection: provider.cashInHand,
  settlementAmount: totalTransferableSalary - advanceDeduction,
  createdBy: req.user?._id
};

try {
  const settlementTransaction = await SettlementTransaction.create(settlementTransactionData);
  console.log('Provider settlement transaction created:', settlementTransaction._id);
} catch (error) {
  console.error('Error creating provider settlement transaction:', error);
}

    
        res.status(200).json({
            success: true,
            message: 'Provider settlement completed successfully',
            // data: {
            //     providerName: provider.name,
            //     totalTransferredAmount: totalTransferableAmount,
            //     remainingCash: remainingCash,
            //     advanceDeduction: advanceDeduction,
            //     newAdvanceBalance: newAdvanceBalance,
            //     currentSettlementDate: currentSettlementDate,
            //     previousSettlementDate: settlementDatesUpdate.previousSettlementCompletedDate,
            //     provider: {
            //         _id: updatedProvider._id,
            //         name: updatedProvider.name,
            //         cashInHand: updatedProvider.cashInHand,
            //         advance: updatedProvider.advance,
            //         balanceAmount: updatedProvider.balanceAmount,
            //         settlement: updatedProvider.settlement,
            //         settlementCompletedDate: updatedProvider.settlementCompletedDate
            //     }
            // }
             data: {
                totalTransferredSalary: totalTransferableSalary,
                remainingAmount: remainingAmount,
                advanceDeduction: advanceDeduction,
                newAdvanceBalance: newAdvanceBalance,
                currentSettlementDate: currentSettlementDate,
                previousSettlementDate: settlementDatesUpdate.previousSettlementCompletedDate,
                driver: updatedProvider
            }
        });

    } catch (error) {     
        console.error('Provider settlement error:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing provider settlement',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};