const mongoose = require('mongoose');
const { DatabaseError } = require('../Middileware/errorHandler');
require('dotenv').config(); // Load .env variables

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(error.message);
        process.exit(1); 
    }
};

module.exports = connectDB;


