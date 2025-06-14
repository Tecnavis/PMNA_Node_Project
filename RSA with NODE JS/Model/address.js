const mongoose = require('mongoose');

const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Puducherry', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh'
];

const addressSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        minlength: [3, 'Minimum 3 characters required'],
        maxlength: [100, 'Maximum 100 characters allowed'],
        trim: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
            validator: v => /^\d{10}$/.test(v),
            message: props => `${props.value} is not a valid 10-digit Indian mobile number!`,
        },
    },
    whatsappNumber: {
        type: String,
        required: [true, 'WhatsApp number is required'],
        trim: true,
        validate: {
            validator: v => /^\d{10}$/.test(v),
            message: props => `${props.value} is not a valid 10-digit Indian mobile number!`,
        },
    },
    email: {
        type: String,
        trim: true,
        validate: {
            validator: v => !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v),
            message: props => `${props.value} is not a valid email address!`,
        },
    },
    addressLine1: {
        type: String,
        required: [true, 'Address Line 1 is required'],
        trim: true,
    },
    addressLine2: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
    },
    pinCode: {
        type: String,
        required: [true, 'PIN Code is required'],
        validate: {
            validator: v => /^\d{6}$/.test(v),
            message: props => `${props.value} is not a valid 6-digit Indian PIN code!`,
        },
    },
    country: {
        type: String,
        default: 'India',
        enum: ['India'], 
    },
    addressType: {
        type: String,
        enum: ['Home', 'Work', 'Other'],
        default: 'Home',
    },
}, {
    timestamps: true,
});

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;