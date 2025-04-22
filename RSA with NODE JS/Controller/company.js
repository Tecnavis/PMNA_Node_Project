// controllers/company.controller.js
const Company = require('../Model/company');
const { calculateNetTotalAmountInHand } = require('../services/companyService');

exports.createCompany = async (req, res) => {
  try {
    const { name, idNumber, phone, personalPhoneNumber, password, creditLimitAmount, vehicle } = req.body;

    // Handle vehicle array data
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

    const company = new Company({
      name,
      idNumber,
      phone,
      personalPhoneNumber,
      password,
      creditLimitAmount: creditLimitAmount || null, // Set creditLimitAmount if provided or null
      image: req.file ? req.file.filename : null, // Store image filename if uploaded
      vehicle: vehicleData,
    });

    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find().populate('vehicle.serviceType');

    const staffWithAmount = await Promise.all(
      companies.map(async (st) => {
        const netAmount = await calculateNetTotalAmountInHand(st._id);
        st.cashInHand = netAmount;
        await st.save();
        return st;
      })
    );

    res.json(staffWithAmount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate('vehicle.serviceType');

    const netAmount = await calculateNetTotalAmountInHand(company._id);
    company.cashInHand = netAmount;
    await company.save();
    
    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateCompany = async (req, res) => {
  try {
    const { name, idNumber, phone, personalPhoneNumber, password, creditLimitAmount, vehicle } = req.body;

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Parse vehicle if it's a string
    const parsedVehicle = typeof vehicle === 'string' ? JSON.parse(vehicle) : vehicle;

    // Prepare vehicle data
    const vehicleData = Array.isArray(parsedVehicle)
      ? parsedVehicle.map(v => ({
        serviceType: v.id || v.serviceType, // Handle both creation and update cases
        basicAmount: v.basicAmount,
        kmForBasicAmount: v.kmForBasicAmount,
        overRideCharge: v.overRideCharge,
        vehicleNumber: v.vehicleNumber,
      }))
      : company.vehicle; // Retain the existing vehicle data if none provided

    // Update company fields
    company.name = name || company.name;
    company.idNumber = idNumber || company.idNumber;
    company.phone = phone || company.phone;
    company.personalPhoneNumber = personalPhoneNumber || company.personalPhoneNumber;
    company.password = password || company.password;
    company.creditLimitAmount = creditLimitAmount || company.creditLimitAmount;
    company.image = req.file ? req.file.filename : company.image;
    company.vehicle = vehicleData;

    await company.save();
    res.status(200).json(company);
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: error.message });
  }
};


exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.filtergetCompanies = async (req, res) => {
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

    const company = await Company.find(filter).populate('vehicle.serviceType');

    const staffWithAmount = await Promise.all(
      company.map(async (st) => {
        const netAmount = await calculateNetTotalAmountInHand(st._id);
        st.cashInHand = netAmount;
        await st.save();
        return st;
      })
    );

    res.json(staffWithAmount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};