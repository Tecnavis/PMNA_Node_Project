const mongoose = require('mongoose');

const petrolPumpSchema = new mongoose.Schema({
  pumpName: {
    type: String,
    required: [true, 'Petrol pump name is required'],
    trim: true,
    unique: true,  // This automatically creates an index
    maxlength: [100, 'Petrol pump name cannot exceed 100 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  latitude: {
    type: String,
    required: [true, 'Latitude is required'],
    trim: true
  },
  longitude: {
    type: String,
    required: [true, 'Longitude is required'],
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Allow empty or 10-digit numbers
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Contact number must be 10 digits'
    }
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  fuelTypes: [{
    type: String,
    enum: {
      values: ['Petrol', 'Diesel', 'CNG', 'Premium Petrol', 'Diesel Exhaust Fluid'],
      message: '{VALUE} is not a valid fuel type'
    }
  }]
}, {
  timestamps: true
});

// Remove the pumpName index since unique: true already creates it
// petrolPumpSchema.index({ pumpName: 1 }); // REMOVE THIS LINE

// Keep these indexes for other fields
petrolPumpSchema.index({ location: 1 });
petrolPumpSchema.index({ fuelTypes: 1 });

module.exports = mongoose.model('PetrolPump', petrolPumpSchema);