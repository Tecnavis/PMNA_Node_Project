// scripts/debugArchive.js - UPDATED
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugArchive() {
    try {
        // Load environment variables
        
        // Check for MongoDB URI in different possible locations
        const mongoUri = process.env.MONGO_URI;
        
       
        if (!mongoUri) {
     
            process.exit(1);
        }
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
        });
        
        // Load models
        const Booking = require('../Model/booking');
        const BookingArchive = require('../Model/bookingArchive');
        
        // Calculate cutoff date (3 months ago)
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        
       
        // Check total counts
        const totalBookings = await Booking.countDocuments({});
        
        // Check archived status
        const archivedCount = await Booking.countDocuments({ archived: true });
        const notArchivedCount = await Booking.countDocuments({ archived: false });
        const noArchivedField = await Booking.countDocuments({ archived: { $exists: false } });
      
        // Check bookings older than cutoff
        const oldBookings = await Booking.countDocuments({ 
            createdAt: { $lt: cutoffDate } 
        });
        
        // Check what SHOULD be archived
        const shouldArchive = await Booking.countDocuments({
            $and: [
                { 
                    $or: [
                        { archived: false },
                        { archived: { $exists: false } },
                        { archived: null }
                    ]
                },
                { createdAt: { $lt: cutoffDate } }
            ]
        });
        
        // Get sample of old bookings
        const sampleOld = await Booking.find({
            $and: [
                { 
                    $or: [
                        { archived: false },
                        { archived: { $exists: false } },
                        { archived: null }
                    ]
                },
                { createdAt: { $lt: cutoffDate } }
            ]
        })
        .limit(5)
        .select('fileNumber createdAt archived archivedAt status')
        .sort({ createdAt: 1 })
        .lean();
        
        sampleOld.forEach((b, i) => {
            console.log(`  ${i+1}. ${b.fileNumber}`);
            console.log(`     Created: ${b.createdAt}`);
            console.log(`     Status: ${b.status}`);
            console.log(`     Archived: ${b.archived}`);
            console.log(`     Archived At: ${b.archivedAt}`);
            console.log(`     Days old: ${Math.floor((new Date() - new Date(b.createdAt)) / (1000 * 60 * 60 * 24))} days`);
            console.log('');
        });
        
        // Check if any bookings are actually 3+ months old
        if (sampleOld.length > 0) {
            const oldest = sampleOld[0];
            const daysOld = Math.floor((new Date() - new Date(oldest.createdAt)) / (1000 * 60 * 60 * 24));
            console.log(`\n⏳ Oldest booking in sample: ${daysOld} days old`);
            
            if (daysOld < 90) {
                console.log(`⚠️  WARNING: Oldest booking is only ${daysOld} days old (< 90 days)`);
                console.log(`   You may not have bookings older than 3 months yet!`);
            }
        }
        
        // Check archive collection
        const archiveCount = await BookingArchive.countDocuments({});
        
        if (archiveCount > 0) {
            const sampleArchived = await BookingArchive.find()
                .limit(3)
                .select('fileNumber archiveDate createdAt')
                .lean();
            
            console.log(`Sample archived bookings:`);
            sampleArchived.forEach((b, i) => {
                console.log(`  ${i+1}. ${b.fileNumber} - Archived: ${b.archiveDate} - Created: ${b.createdAt}`);
            });
        }
        
        // Test schema compatibility
        if (sampleOld.length > 0) {
            const testBooking = sampleOld[0];
            console.log('Sample booking fields:', Object.keys(testBooking).length, 'fields');
            
            // Check if booking_archive collection exists
            const collections = await mongoose.connection.db.listCollections().toArray();
            const hasArchiveCollection = collections.some(c => c.name === 'booking_archive');
            console.log(`Booking_archive collection exists: ${hasArchiveCollection}`);
            
            if (!hasArchiveCollection) {
                console.log('❌ ERROR: booking_archive collection does not exist!');
                console.log('Run this command to create it:');
                console.log('   await BookingArchive.createCollection();');
            }
        }
        
        await mongoose.disconnect();
        console.log('\n✅ Debug completed successfully');
        
      
    } catch (error) {
        console.error('❌ Debug error:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run with error handling
debugArchive().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
});