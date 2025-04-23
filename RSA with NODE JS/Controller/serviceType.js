// controllers/serviceType.controller.js
const ServiceType = require('../Model/serviceType');

// Create a new service type
exports.createServiceType = async (req, res) => {
  try {
    const newServiceType = new ServiceType(req.body);
    await newServiceType.save();
    res.status(201).json({ message: 'Service type created successfully', data: newServiceType });
  } catch (error) {
    res.status(400).json({ message: 'Error creating service type', error: error.message });
  }
};

// Get all service types
exports.getAllServiceTypes = async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find();
    res.status(200).json(serviceTypes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service types', error: error.message });
  }
};

// Get a single service type by ID
exports.getServiceTypeById = async (req, res) => {
  try {
    const serviceType = await ServiceType.findById(req.params.id);
    if (!serviceType) return res.status(404).json({ message: 'Service type not found' });
    res.status(200).json(serviceType);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching service type', error: error.message });
  }
};

// Update a service type by ID
exports.updateServiceType = async (req, res) => {
  try {
    const updatedServiceType = await ServiceType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedServiceType) return res.status(404).json({ message: 'Service type not found' });
    res.status(200).json({ message: 'Service type updated successfully', data: updatedServiceType });
  } catch (error) {
    res.status(400).json({ message: 'Error updating service type', error: error.message });
  }
};

// Delete a service type by ID
exports.deleteServiceType = async (req, res) => {
  try {
    const deletedServiceType = await ServiceType.findByIdAndDelete(req.params.id);
    if (!deletedServiceType) return res.status(404).json({ message: 'Service type not found' });
    res.status(200).json({ message: 'Service type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting service type', error: error.message });
  }
};
