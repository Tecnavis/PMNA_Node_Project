const BaseLocation = require('../Model/baseLocation'); // Adjust the path as needed

// Create a new base location
exports.createBaseLocation = async (req, res) => {
  try {
    const { baseLocation, latitudeAndLongitude } = req.body;

    const newBaseLocation = new BaseLocation({ baseLocation, latitudeAndLongitude });
    await newBaseLocation.save();

    res.status(201).json({ message: "Base location created successfully", data: newBaseLocation });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all base locations
exports.getBaseLocations = async (req, res) => {
  try {
    const locations = await BaseLocation.find();
    res.status(200).json({ data: locations });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single base location by ID
exports.getBaseLocationById = async (req, res) => {
    const {id} = req.params
  try {
    const location = await BaseLocation.findById(id);
    if (!location) return res.status(404).json({ message: "Base location not found" });

    res.status(200).json({ data: location });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a base location
exports.updateBaseLocation = async (req, res) => {
    const { baseLocation, latitudeAndLongitude } = req.body;
    const {id} = req.params
  try {
    const location = await BaseLocation.findByIdAndUpdate(
      id,
      { baseLocation, latitudeAndLongitude },
      { new: true }
    );
    if (!location) return res.status(404).json({ message: "Base location not found" });

    res.status(200).json({ message: "Base location updated successfully", data: location });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a base location
exports.deleteBaseLocation = async (req, res) => {
    const {id} = req.params
  try {
    const location = await BaseLocation.findByIdAndDelete(id);
    if (!location) return res.status(404).json({ message: "Base location not found" });

    res.status(200).json({ message: "Base location deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};
