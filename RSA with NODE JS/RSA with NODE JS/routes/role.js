const express = require('express');
const controller = require('../Controller/role');
const Jwt = require('../Middileware/jwt')

const router = express.Router();

// Route for creating a new role
router.post('/',Jwt,controller.createRole);

// Route for getting all roles
router.get('/',Jwt,controller.getAllRoles);

// Route for getting a single role by ID
router.get('/:id',Jwt,controller.getRoleById);

// Route for updating a role by ID
router.put('/:id',Jwt,controller.updateRole);

// Route for deleting a role by ID
router.delete('/:id',Jwt,controller.deleteRole);

module.exports = router;
