const Role = require('../Model/role');

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const name = req.body.name.trim(); // Trim whitespace from the name

    // Prevent creating a role with name 'admin' (case-insensitive)
    if (name.toLowerCase() === 'admin') {
      return res.status(400).json({ message: "Cannot create role 'admin'." });
    }

    // Check if the role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: `Role '${name}' already exists.` });
    }

    const role = new Role({ name });
    await role.save();
    res.status(201).json({ message: 'Role created successfully', role });
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error });
  }
};

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roles', error });
  }
};

// Get a single role by ID
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.status(200).json(role);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching role', error });
  }
};

// Update a role by ID
exports.updateRole = async (req, res) => {
  try {
    const name = req.body.name ? req.body.name.trim() : undefined; // Trim whitespace from the name

    // Prevent renaming a role to 'admin' (case-insensitive)
    if (name && name.toLowerCase() === 'admin') {
      return res.status(400).json({ message: "Cannot rename role to 'admin'." });
    }

    const role = await Role.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.status(200).json({ message: 'Role updated successfully', role });
  } catch (error) {
    res.status(500).json({ message: 'Error updating role', error });
  }
};

// Delete a role by ID
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    res.status(200).json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting role', error });
  }
};
