const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const { token } = require('morgan');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type:String,
    default:'admin'
  },
  tokens: { type: String, default: "" },
});
adminSchema.pre("save", async function (next) {
    if (this.isModified("password") || this.isNew) {
      if (!this.password.startsWith("$2b$")) {
        try {
          const hashedPassword = await bcrypt.hash(this.password, 10);
          this.password = hashedPassword;
          next()
        } catch (err) {
          console.log(err.message, "something went wrong in password hashing");
          return next(err);
        }
      } else {
        console.log("Password is already hashed.");
        return next();
      }
    } else {
      console.log("Password is not modified.");
      return next();
    }
  });


module.exports = mongoose.model('Admin', adminSchema)