const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const validator = require('validator'); // Missing import

const marketingExecutiveSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxLength: [100, 'Name cannot exceed 100 characters'] // Fixed typo in message
    },
    email: {
        type: String,
        trim: true,
        required: [true, 'Email is required'],
        unique: true, 
        validate: {
            validator: validator.isEmail,
            message: 'Please provide a valid email'
        },
        index: true
    },
    address: {
        type: String,
        trim: true,
        required: [true, 'Address is required'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/.test(v);
            },
            message: 'Please provide a valid phone number'
        }
    },
    userName: {
        type: String,
        required: [true, 'User name is required'],
        unique: true,
        trim: true,
        maxLength: [100, 'User name cannot exceed 100 characters']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
    },
    image: {
        type: String,
        trim: true,
    },
    cashInHand: {
        type: Number,
        default: 0,
    },
    rewardPoints: {
        type: Number,
        default: 0,
        min: [0, 'Reward points cannot be negative']
    },
}, { timestamps: true });

marketingExecutiveSchema.index({
    'name': 'text',
    'email': 1,
    'userName': 1 
});

// Password comparison method
marketingExecutiveSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password); // Fixed: was using accountInfo.password
};

module.exports = mongoose.model('Executive', marketingExecutiveSchema);