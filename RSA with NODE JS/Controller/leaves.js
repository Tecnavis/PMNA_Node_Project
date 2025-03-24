const Leaves = require('../Model/leaves');

exports.createLeaves = async (req, res) => {
  try {
    console.log("Received Data:", req.body); // Debugging line
    console.log("Route Hit: /createLeaves");

    const newLeaves = new Leaves(req.body);
    await newLeaves.save();

    res.status(201).json({ message: 'Leaves created successfully', data: newLeaves });
  } catch (error) {
    console.error("Error creating leave:", error); // Log error
    res.status(400).json({ message: 'Error creating Leave type', error: error.message });
  }
};


exports.getAllLeaves = async (req, res) => {
  try {
    console.log("Fetching all leaves...");

    const allLeaves = await Leaves.find().populate("driver"); // Ensure 'driver' reference is populated
    res.status(200).json(allLeaves);
  } catch (error) {
    console.error("Error fetching leaves:", error); // Log error
    res.status(500).json({ message: 'Error fetching Leave types', error: error.message });
  }
};


// Get a single service type by ID
exports.getLeavesById = async (req, res) => {
  try {
    const leaves = await Leaves.findById(req.params.id);
    if (!leaves) return res.status(404).json({ message: 'Leaves not found' });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaves', error: error.message });
  }
};

// Update a service type by ID
exports.updateLeaves = async (req, res) => {
  try {
    const updatedLeaves = await Leaves.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedLeaves) return res.status(404).json({ message: 'Leaves not found' });
    res.status(200).json({ message: 'Leave updated successfully', data: updatedLeaves });
  } catch (error) {
    res.status(400).json({ message: 'Error updating Leaves', error: error.message });
  }
};

// Delete a service type by ID
exports.deleteLeaves = async (req, res) => {
  try {
    const deletedLeaves = await Leaves.findByIdAndDelete(req.params.id);
    if (!deletedLeaves) return res.status(404).json({ message: 'Leave type not found' });
    res.status(200).json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting Leave type', error: error.message });
  }
};
