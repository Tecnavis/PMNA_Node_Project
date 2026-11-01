const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,  // Automatically trims whitespace
  },
  // What this role may see and do on the admin website: { '<permission key>': true | false }.
  // A key that is not set keeps the built-in default for the role.
  permissions: { type: mongoose.Schema.Types.Mixed, default: undefined },
});

module.exports = mongoose.model('Role', roleSchema);
