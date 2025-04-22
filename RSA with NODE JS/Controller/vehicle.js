const Vehicle = require("../Model/vehicle");
const Booking = require('../Model/booking');
const TaxInsurance = require('../Model/taxInsurance')

// Create vehicle
exports.createVehicle = async (req, res) => {
    try {
        const { vehicleName, serviceKM, serviceVehicle } = req.body

        if(!vehicleName && !serviceKM && !serviceVehicle){
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingVehicle = await Vehicle.findOne({ serviceVehicle: req.body.serviceVehicle });
        if (existingVehicle) {
            return res.status(400).json({ message: 'Vehicle name already exists' });
        }

        const vehicleData = new Vehicle({
            vehicleName: req.body.vehicleName,
            serviceKM: req.body.serviceKM,
            serviceVehicle: req.body.serviceVehicle
        })
        await vehicleData.save();
        res.status(201).json({ message: 'Vehicle created successfully!', data: vehicleData });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

// Read Vehicles (Get all vehicles)
exports.getAllVehicle = async (req, res) => {
    try {
      let { search = "", page = 1, limit = 10 } = req.query;
  
      page = parseInt(page, 10) || 1;
      limit = parseInt(limit, 10);
      const skip = (page - 1) * limit;
  
      let query = {};
  
      if (search.trim()) {
        query = {
          $or: [
            { vehicleName: { $regex: search, $options: "i" } },
            { serviceVehicle: { $regex: search, $options: "i" } },
          ],
        };
      }
  
      const [vehicles, total] = await Promise.all([
        Vehicle.find(query).skip(skip).limit(limit),
        Vehicle.countDocuments(query),
      ]);
  
      res.status(200).json({
        data: vehicles,
        page,
        limit,
        total,
      });
    } catch (error) {
      console.error("Error in getAllVehicle:", error);
      res.status(500).json({ message: error.message });
    }
  };
  

// Read vechicle by ID
exports.getVehicleById = async (req, res) => {
    try {
        const vechicle = await Vehicle.findById(req.params.id)
        if (!vechicle) return res.status(404).json({ message: 'Vehicle not found' });
        res.status(200).json(vechicle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Vehicle
exports.updateVehicle = async (req, res) => {
    try {
        const updatedData = {
            vehicleName: req.body.vehicleName,
            serviceKM: req.body.serviceKM,
            serviceVehicle: req.body.serviceVehicle
        };

        const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        res.status(200).json({ message: 'Vehicle updated successfully!', data: vehicle });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete Staff
exports.deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        res.status(200).json({ message: 'Vehicle deleted successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add Record
exports.addRecord = async (req, res) => {
    try {
        const { vehicleNumber } = req.body
        
        const vehicle = await Vehicle.find({ serviceVehicle: vehicleNumber })
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' })
        }

        const newFiles = req.files && req.files.length ? req.files.map(file => file.filename) : [];
        if (!newFiles.length) {
            return res.status(400).json({ message: 'No files were uploaded.' })
        }

        let insurancePaperUrl = newFiles[0]
        let taxPaperUrl = newFiles[1]

        const newrecord = new TaxInsurance({
            vehicleNumber,
            emiExpiryDate: req.body.emiExpiryDate,
            insuranceExpiryDate: req.body.insuranceExpiryDate,
            pollutionExpiryDate: req.body.pollutionExpiryDate,
            taxExpiryDate: req.body.taxExpiryDate,
            taxPaperUrl,
            insurancePaperUrl
        })

        await newrecord.save()

        return res.status(201).json({ message: 'Vehicle created successfully', data: newrecord })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Get all vehicle records (tax, insurance, EMI, pollution) details
exports.getAllRecordDetails = async (req, res) => {
    try {

        let { search = '', page = 1, limit = 10 } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10);
        const skip = (page - 1) * limit;

        let query = {};

        if (search.trim()) {
            query = {
                $or: [
                    { vehicleNumber: { $regex: search.trim(), $options: "i" } },
                ],
            };
        }

        const [records, total] = await Promise.all([
            TaxInsurance.find(query).skip(skip).limit(limit),
            TaxInsurance.countDocuments(query),
        ]);

        res.status(200).json({
            data: records,
            page,
            limit,
            total,
        });

    } catch (error) {
        console.error("Error in getAllComplianceDetails:", error);
        res.status(500).json({ error: error.message });
    }
};

//Delete vehicle record
exports.deleteRecord = async (req, res) => {
    try {
        const vehicle = await TaxInsurance.findByIdAndDelete(req.params.id);

        if (!vehicle) return res.status(404).json({ message: 'Record not found' });

        res.status(200).json({ message: 'Record deleted successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

//Update Record
exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicleNumber, emiExpiryDate, insuranceExpiryDate, pollutionExpiryDate, taxExpiryDate, taxPaperChange, insurancePaperChange } = req.body;

        let existingRecord = await TaxInsurance.findById(id);
        if (!existingRecord) {
            return res.status(404).json({ message: 'Vehicle record not found' });
        }

        const vehicle = await Vehicle.findOne({ serviceVehicle: vehicleNumber });
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        // Process uploaded files if provided
        const newFiles = req.files && req.files.length ? req.files.map(file => file.filename) : [];

        let insurancePaperUrl = existingRecord.insurancePaperUrl;
        let taxPaperUrl = existingRecord.taxPaperUrl;


        // Handle file updates based on changes
        if (insurancePaperChange && newFiles.length > 0) {
            insurancePaperUrl = newFiles[0]; // Update insurance paper URL
        }

        if (taxPaperChange) {
            if (insurancePaperChange && newFiles.length > 1) {
                taxPaperUrl = newFiles[1]; // Update tax paper URL if both files are uploaded
            } else if (!insurancePaperChange && newFiles.length > 0) {
                taxPaperUrl = newFiles[0]; // Update tax paper URL if only tax file is uploaded
            }
        }

        // Validate that required fields are not undefined
        if (!insurancePaperUrl || !taxPaperUrl) {
            return res.status(400).json({ message: 'Insurance and tax paper URLs are required' });
        }

        // Update record fields
        existingRecord.vehicleNumber = vehicleNumber;
        existingRecord.emiExpiryDate = emiExpiryDate;
        existingRecord.insuranceExpiryDate = insuranceExpiryDate;
        existingRecord.pollutionExpiryDate = pollutionExpiryDate;
        existingRecord.taxExpiryDate = taxExpiryDate;
        existingRecord.insurancePaperUrl = insurancePaperUrl;
        existingRecord.taxPaperUrl = taxPaperUrl;

        await existingRecord.save();

        return res.status(200).json({ message: 'Vehicle record updated successfully', data: existingRecord });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ error: error.message });
    }
};

// Read record by ID
exports.getRecordById = async (req, res) => {
    try {
        const record = await TaxInsurance.findById(req.params.id)
        if (!record) return res.status(404).json(record);
        res.status(200).json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Update dismissed record field
exports.dismissExpiredRecord = async (req, res) => {
    try {
        const { type, role, vehicleNumber } = req.body;

        if (!type || !role || !vehicleNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Mapping type to respective fields
        const typeMapping = {
            EMI: { dueField: "emiDue", dismissedByField: "emiDuedismissedBy" },
            Insurance: { dueField: "insuranceDue", dismissedByField: "insuranceDueDismissedBy" },
            Pollution: { dueField: "pollutionDue", dismissedByField: "pollutionDueDismissedBy" },
            Tax: { dueField: "taxDue", dismissedByField: "taxDueDismissedBy" }
        };

        // Check if the provided type is valid
        if (!typeMapping[type]) {
            return res.status(400).json({ message: "Invalid type provided" });
        }

        // Extract relevant field names based on type
        const { dueField, dismissedByField } = typeMapping[type];

        // Update the document dynamically based on type
        const updatedRecord = await TaxInsurance.findOneAndUpdate(
            { vehicleNumber },
            {
                $set: {
                    [dueField]: true,
                    [dismissedByField]: role
                }
            },
            { new: true }
        );

        if (!updatedRecord) {
            return res.status(404).json({ message: "Vehicle record not found" });
        }

        return res.status(200).json({
            message: `${type} due dismissed successfully`,
            updatedRecord
        });

    } catch (error) {
        console.error("Error dismissing expired record:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all vehicles exceeding serviceKM and not dismissed
exports.getVehiclesExceedingServiceKM = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({
            valid : false,
            vehicleServiceDismissed: false, 
        });

        if (vehicles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No vehicles have exceeded their service KM or all are dismissed.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Vehicles exceeding service KM retrieved successfully.",
            vehicles,
        });
    } catch (error) {
        console.error("Error fetching vehicles:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching vehicles.",
            error: error.message,
        });
    }
};

// Update service Km reached vehicle to valid state
exports.updateVehicleServiceStatus = async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const {  role } = req.body; // New serviceKM value

        // Find the vehicle
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found",
            });
        }

        // Update fields
        vehicle.vehicleServiceDue = true;
        vehicle.vehicleServiceDismissed = true;
        vehicle.DismissedBy = role
        vehicle.valid = true

        await vehicle.save();

        res.status(200).json({
            success: true,
            message: "Vehicle updated successfully",
            vehicle,
        });
    } catch (error) {
        console.error("Error updating vehicle:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating the vehicle.",
            error: error.message,
        });
    }
};