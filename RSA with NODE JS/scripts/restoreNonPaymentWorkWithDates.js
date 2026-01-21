// scripts/restoreNonPaymentWorkWithDates.js
const mongoose = require('mongoose');
require('dotenv').config();

async function restoreNonPaymentWorkWithDates() {
    console.log('🚀 Restoring non-PaymentWork bookings with correct dates...');
    
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
                // Determine correct dates
                let correctCreatedAt = archive.createdAt;
                let correctUpdatedAt = archive.updatedAt;
                
                // If createdAt is recent (2026), but we have older pickupTime
                if (archive.createdAt && archive.createdAt.getFullYear() >= 2026) {
                    // Priority 1: Use pickupTime
                    if (archive.pickupTime && archive.pickupTime.getFullYear() < 2026) {
                        correctCreatedAt = archive.pickupTime;
                        correctUpdatedAt = archive.pickupTime;
                        console.log(`📅 ${archive.fileNumber}: Using pickupTime ${archive.pickupTime} instead of ${archive.createdAt}`);
                    }
                    // Priority 2: Use verifiedAt
                    else if (archive.verifiedAt && archive.verifiedAt.getFullYear() < 2026) {
                        correctCreatedAt = archive.verifiedAt;
                        correctUpdatedAt = archive.verifiedAt;
                        console.log(`📅 ${archive.fileNumber}: Using verifiedAt ${archive.verifiedAt} instead of ${archive.createdAt}`);
                    }
                    // Priority 3: Use archiveDate - 3 months
                    else if (archive.archiveDate) {
                        const fixedDate = new Date(archive.archiveDate);
                        fixedDate.setMonth(fixedDate.getMonth() - 3);
                        correctCreatedAt = fixedDate;
                        correctUpdatedAt = fixedDate;
                        console.log(`📅 ${archive.fileNumber}: Using archiveDate - 3 months: ${fixedDate}`);
                    }
                }
                
                // Create booking document with correct dates
                const bookingDoc = { 
                    ...archive,
                    _id: archive.originalId || archive._id,
                    createdAt: correctCreatedAt,
                    updatedAt: correctUpdatedAt,
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
        console.log(`Restored ${restored} non-PaymentWork bookings with correct dates`);
        
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
restoreNonPaymentWorkWithDates();