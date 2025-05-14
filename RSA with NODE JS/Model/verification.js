const mongoose = require('mongoose');
const { Schema } = mongoose;


// Constants for enum values
const USER_TYPES = Object.freeze({
  ADMIN: 'Admin',
  STAFF: 'Staff',
  MARKETING_EXEC: 'MarketingExecutive'
});

// Verification schema for tracking showroom visits with geotagging.
const verificationSchema = new Schema({
  showroom: {
    type: Schema.Types.ObjectId,
    ref: 'Showroom',
    required: [true, 'Showroom reference is required'],
    index: true
  },
  executive: {
    type: Schema.Types.ObjectId,
    ref: USER_TYPES.MARKETING_EXEC,
    required: [true, 'Executive reference is required'],
    index: true
  },
  verificationDate: {
    type: Date,
    required: [true, 'Verification date is required'],
    default: Date.now,
    index: true
  },
  geoTag: {
    type: {
      type: String,
      default: 'Point',
      enum: ['Point'],
      required: [true, 'GeoTag type is required']
    },
    coordinates: {
      type: [Number],
      required: [true, 'Coordinates are required'],
      validate: {
        validator: function (coords) {
          return coords.length === 2 &&
            typeof coords[0] === 'number' &&
            typeof coords[1] === 'number';
        },
        message: 'Coordinates must be an array of [longitude, latitude]'
      }
    }
  },
  accuracy: {
    type: Number,
    min: [0, 'Accuracy must be a positive number'],
    required: [true, 'Accuracy measurement is required']
  },
  image: {
    type: String,
    validate: {
      validator: function (url) {
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(url);
      },
      message: 'Invalid image URL format'
    }
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  verificationAddedBy: {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, 'User reference is required'],
      refPath: 'verificationAddedBy.userType'
    },
    userType: {
      type: String,
      required: [true, 'User type is required'],
      enum: {
        values: Object.values(USER_TYPES),
        message: 'User type must be Admin, Staff, or MarketingExecutive'
      }
    }
  },
}, {
  timestamps: true
});

// Virtual for easy access to coordinates
verificationSchema.virtual('latitude').get(function () {
  return this.geoTag.coordinates[1];
});

verificationSchema.virtual('longitude').get(function () {
  return this.geoTag.coordinates[0];
});

// Indexes
// Indexes
verificationSchema.index({ showroom: 1, executive: 1 });
verificationSchema.index({ verificationDate: -1 });
verificationSchema.index({ geoTag: '2dsphere' });
verificationSchema.index({ 'verificationAddedBy.user': 1 });
verificationSchema.index({ 'verificationAddedBy.userType': 1 });


// Static methods
verificationSchema.statics.findByShowroom = function (showroomId) {
  return this.find({ showroom: showroomId })
    .sort({ verificationDate: -1 })
    .populate('executive', 'name email')
    .populate('verificationAddedBy', 'name email');
};

// Static method to get verifications by added user
verificationSchema.statics.findByAddedUser = function(userId, userType) {
  return this.find({ 
    'verificationAddedBy.user': userId,
    'verificationAddedBy.userType': userType 
  })
  .sort({ verificationDate: -1 })
  .populate('showroom', 'name location')
  .populate('executive', 'name email');
};

// Query helpers
verificationSchema.query.byUserType = function (userType) {
  return this.where({ verificationUserType: userType });
};

module.exports = mongoose.model('Verification', verificationSchema);