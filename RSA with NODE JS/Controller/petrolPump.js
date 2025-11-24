const PetrolPump = require('../Model/petrol');

// Create a new petrol pump
exports.createPetrolPump = async (req, res) => {
  try {
    const { 
      pumpName, 
      location, 
      latitude, 
      longitude, 
      contactNumber, 
      address, 
      fuelTypes 
    } = req.body;

    // Check if petrol pump with same name already exists
    const existingPump = await PetrolPump.findOne({ pumpName });
    if (existingPump) {
      return res.status(400).json({ message: "Petrol pump with this name already exists" });
    }

    const newPetrolPump = new PetrolPump({ 
      pumpName, 
      location, 
      latitude, 
      longitude, 
      contactNumber, 
      address, 
      fuelTypes 
    });
    
    await newPetrolPump.save();

    res.status(201).json({ 
      message: "Petrol pump created successfully", 
      data: newPetrolPump 
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error", 
        error: err.message 
      });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Get all petrol pumps
exports.getPetrolPump = async (req, res) => {
  try {
    const pumps = await PetrolPump.find().sort({ createdAt: -1 });
    res.status(200).json({ 
      success: true,
      data: pumps 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// Get a single petrol pump by ID
exports.getPetrolPumpId = async (req, res) => {
  const { id } = req.params;
  
  try {
    const pump = await PetrolPump.findById(id);
    if (!pump) {
      return res.status(404).json({ 
        success: false,
        message: "Petrol pump not found" 
      });
    }

    res.status(200).json({ 
      success: true,
      data: pump 
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: "Invalid petrol pump ID" 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// Update a petrol pump
exports.updatePetrolPump = async (req, res) => {
  const { id } = req.params;
  const { 
    pumpName, 
    location, 
    latitude, 
    longitude, 
    contactNumber, 
    address, 
    fuelTypes 
  } = req.body;

  try {
    // Check if another petrol pump with the same name exists (excluding current one)
    if (pumpName) {
      const existingPump = await PetrolPump.findOne({ 
        pumpName, 
        _id: { $ne: id } 
      });
      
      if (existingPump) {
        return res.status(400).json({ 
          message: "Another petrol pump with this name already exists" 
        });
      }
    }

    const updatedPump = await PetrolPump.findByIdAndUpdate(
      id,
      { 
        pumpName, 
        location, 
        latitude, 
        longitude, 
        contactNumber, 
        address, 
        fuelTypes 
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedPump) {
      return res.status(404).json({ 
        message: "Petrol pump not found" 
      });
    }

    res.status(200).json({ 
      message: "Petrol pump updated successfully", 
      data: updatedPump 
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error", 
        error: err.message 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid petrol pump ID" 
      });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a petrol pump
exports.deletePetrolPump = async (req, res) => {
  const { id } = req.params;
  
  try {
    const pump = await PetrolPump.findByIdAndDelete(id);
    if (!pump) {
      return res.status(404).json({ 
        message: "Petrol pump not found" 
      });
    }

    res.status(200).json({ 
      message: "Petrol pump deleted successfully" 
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid petrol pump ID" 
      });
    }
    
    res.status(500).json({ message: "Server error" });
  }
};

// Additional controller methods (optional)

// Get petrol pumps by fuel type
exports.getPumpsByFuelType = async (req, res) => {
  try {
    const { fuelType } = req.params;
    
    const pumps = await PetrolPump.find({ 
      fuelTypes: fuelType 
    }).sort({ pumpName: 1 });
    
    res.status(200).json({ 
      success: true,
      data: pumps 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

// Search petrol pumps by location
exports.searchPumpsByLocation = async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({ 
        success: false,
        message: "Location query parameter is required" 
      });
    }

    const pumps = await PetrolPump.find({
      location: { $regex: location, $options: 'i' }
    }).sort({ location: 1 });
    
    res.status(200).json({ 
      success: true,
      data: pumps 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};