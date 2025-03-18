const Showroom = require('../Model/showroom');
const bcrypt = require('bcrypt');

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
