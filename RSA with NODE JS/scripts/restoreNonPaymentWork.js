// scripts/restoreNonPaymentWork.js
const mongoose = require('mongoose');
require('dotenv').config();

async function restoreNonPaymentWork() {
    console.log('🚀 Restoring non-PaymentWork bookings from archive...');
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        const Booking = require('../Model/booking');
        const BookingArchive = require('../Model/bookingArchive');
        
        console.log('\n📊 Statistics before:');
        const nonPaymentWorkInArchive = await BookingArchive.countDocuments({ 
            workType: { $ne: 'PaymentWork' } 
        });
        console.log(`Non-PaymentWork bookings in archive: ${nonPaymentWorkInArchive}`);
        
        if (nonPaymentWorkInArchive === 0) {
            console.log('✅ No non-PaymentWork bookings to restore');
            await mongoose.disconnect();
            return;
        }
        
        console.log('\n🔁 Restoring non-PaymentWork bookings...');
        
        // Get all non-PaymentWork bookings from archive
        const bookingsToRestore = await BookingArchive.find({
            workType: { $ne: 'PaymentWork' }
        }).lean();
        
        let restored = 0;
        
        for (const archive of bookingsToRestore) {
            try {
                // Create booking document
                const bookingDoc = { 
                    ...archive,
                    _id: archive.originalId || archive._id,
                    archived: false,
                    archivedAt: null
                };
                delete bookingDoc.originalId;
                delete bookingDoc.archiveDate;
                
                // Restore to Booking collection
                await Booking.updateOne(
                    { _id: bookingDoc._id },
                    { $set: bookingDoc },
                    { upsert: true }
                );
                
                // Remove from archive
                await BookingArchive.deleteOne({ _id: archive._id });
                
                restored++;
                
                if (restored % 100 === 0) {
                    console.log(`Restored ${restored} bookings...`);
                }
            } catch (error) {
                console.error(`Error restoring ${archive.fileNumber}:`, error.message);
            }
        }
        
        console.log('\n✅ FINISHED!');
        console.log(`Restored ${restored} non-PaymentWork bookings`);
        
        // Final check
        const remaining = await BookingArchive.countDocuments({ 
            workType: { $ne: 'PaymentWork' } 
        });
        console.log(`Non-PaymentWork still in archive: ${remaining} (should be 0)`);
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run it
restoreNonPaymentWork();