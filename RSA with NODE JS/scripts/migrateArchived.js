// // scripts/migrateArchived.js
// const mongoose = require('mongoose');
// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });

// async function migrateArchived() {
//     console.log('🚀 Starting migration of archived bookings...');
    
//     try {
//         const mongoUri = process.env.MONGO_URI;
//         await mongoose.connect(mongoUri);
//         console.log('✅ Connected to MongoDB');
        
//         const Booking = require('../Model/booking');
//         const BookingArchive = require('../Model/bookingArchive');
        
//         console.log('\n🔍 Checking current status...');
        
//         // Count archived bookings
//         const archivedCount = await Booking.countDocuments({ archived: true });
//         const archiveCollectionCount = await BookingArchive.countDocuments();
        
//         console.log(`Archived in bookings collection: ${archivedCount}`);
//         console.log(`Already in booking_archive: ${archiveCollectionCount}`);
        
//         if (archivedCount === 0) {
//             console.log('❌ No archived bookings found to migrate');
//             await mongoose.disconnect();
//             return;
//         }
        
//         console.log(`\n🔄 Migrating ${archivedCount} archived bookings...`);
        
//         // Get all archived bookings
//         const archivedBookings = await Booking.find({ archived: true })
//             .sort({ createdAt: 1 })
//             .lean();
        
//         // Check for duplicates
//         const bookingIds = archivedBookings.map(b => b._id);
//         const existingInArchive = await BookingArchive.find({
//             originalId: { $in: bookingIds }
//         }).select('originalId').lean();
        
//         const existingIds = new Set(existingInArchive.map(b => b.originalId.toString()));
//         const toMigrate = archivedBookings.filter(b => !existingIds.has(b._id.toString()));
        
//         console.log(`Found ${toMigrate.length} unique bookings to migrate`);
        
//         if (toMigrate.length === 0) {
//             console.log('✅ All archived bookings already in archive collection');
            
//             // Optionally delete from original
//             console.log('\n🗑️  Deleting archived bookings from original collection...');
//             await Booking.deleteMany({ archived: true });
//             console.log('✅ Deleted archived bookings from original collection');
            
//             await mongoose.disconnect();
//             return;
//         }
        
//         // Migrate in batches
//         const batchSize = 100;
//         let migrated = 0;
        
//         for (let i = 0; i < toMigrate.length; i += batchSize) {
//             const batch = toMigrate.slice(i, i + batchSize);
            
//             // Prepare archive documents
//             const archiveDocs = batch.map(booking => {
//                 const archiveDoc = { 
//                     ...booking,
//                     originalId: booking._id,
//                     archiveDate: booking.archivedAt || new Date()
//                 };
//                 delete archiveDoc._id;
//                 return archiveDoc;
//             });
            
//             // Insert into archive
//             await BookingArchive.insertMany(archiveDocs, { ordered: false });
            
//             // Delete from original
//             const batchIds = batch.map(b => b._id);
//             await Booking.deleteMany({ _id: { $in: batchIds } });
            
//             migrated += batch.length;
//             console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: Migrated ${batch.length} (Total: ${migrated})`);
            
//             // Small delay
//             await new Promise(resolve => setTimeout(resolve, 50));
//         }
        
//         // Verify
//         const remainingArchived = await Booking.countDocuments({ archived: true });
//         const newArchiveCount = await BookingArchive.countDocuments();
        
//         console.log('\n🎉 MIGRATION COMPLETE!');
//         console.log(`📊 Results:`);
//         console.log(`  - Migrated: ${migrated} bookings`);
//         console.log(`  - Remaining archived in bookings: ${remainingArchived}`);
//         console.log(`  - Total in booking_archive: ${newArchiveCount}`);
        
//         if (remainingArchived > 0) {
//             console.log(`\n⚠️  ${remainingArchived} archived bookings still in original collection`);
//             console.log(`   They may have missing archivedAt field`);
//         }
        
//         await mongoose.disconnect();
//         console.log('\n✅ Migration completed successfully!');
        
//     } catch (error) {
//         console.error('❌ Migration failed:', error);
//         process.exit(1);
//     }
// }

// migrateArchived();